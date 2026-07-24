import { prisma } from "@/lib/db";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";
import { debitWallet, refundToWallet, WalletError } from "@/lib/wallet/service";
import { vtuRouter } from "@/lib/vtu/router";
import { verifyPin } from "@/lib/auth/pin";
import {
  awardPurchaseCommission,
  trackVolumeAndMaybePromote,
} from "@/lib/commissions";
import type { TxService } from "@prisma/client";

type TrailStep = { at: string; status: string; note?: string };

function trail(steps: TrailStep[]) {
  return JSON.stringify(steps);
}
function step(status: string, note?: string): TrailStep {
  return { at: new Date().toISOString(), status, note };
}

async function assertUserPin(userId: string, pin: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false as const, error: "User not found", status: 404 };
  if (!user.pinHash) {
    return {
      ok: false as const,
      error: "Set a 4-digit transaction PIN in Settings first",
      status: 400,
      code: "PIN_REQUIRED",
    };
  }
  if (!(await verifyPin(pin, user.pinHash))) {
    return { ok: false as const, error: "Incorrect transaction PIN", status: 401 };
  }
  return { ok: true as const, user };
}

function serializeTx(t: {
  id: string;
  orderRef: string;
  status: string;
  service: string;
  amount: unknown;
  phone: string | null;
  networkCode: string | null;
  meterNumber: string | null;
  smartCardNumber: string | null;
  customerName: string | null;
  token: string | null;
  packageCode: string | null;
  statusTrail: string;
  deliveredAt: Date | null;
  failureReason: string | null;
  meta: string | null;
  billerId: string | null;
}) {
  let trailParsed: TrailStep[] = [];
  try {
    trailParsed = JSON.parse(t.statusTrail);
  } catch {
    trailParsed = [];
  }
  let meta: unknown = null;
  try {
    meta = t.meta ? JSON.parse(t.meta) : null;
  } catch {
    meta = null;
  }
  return {
    id: t.id,
    orderRef: t.orderRef,
    status: t.status,
    service: t.service,
    amount: Number(t.amount),
    phone: t.phone,
    networkCode: t.networkCode,
    meterNumber: t.meterNumber,
    smartCardNumber: t.smartCardNumber,
    customerName: t.customerName,
    token: t.token,
    packageCode: t.packageCode,
    statusTrail: trailParsed,
    deliveredAt: t.deliveredAt,
    failureReason: t.failureReason,
    meta,
    billerId: t.billerId,
  };
}

async function runWalletPurchase(opts: {
  userId: string;
  service: TxService;
  amount: number;
  pin: string;
  idempotencyKey?: string;
  fields: {
    phone?: string | null;
    meterNumber?: string | null;
    smartCardNumber?: string | null;
    customerName?: string | null;
    packageCode?: string | null;
    billerId?: string | null;
    meta?: Record<string, unknown>;
  };
  execute: (
    idempotencyKey: string
  ) => Promise<{ success: boolean; providerCode: string; providerRef?: string; token?: string; pin?: string; error?: string; customerName?: string }>;
}) {
  const pinCheck = await assertUserPin(opts.userId, opts.pin);
  if (!pinCheck.ok) return pinCheck;

  const idempotencyKey = opts.idempotencyKey || makeIdempotencyKey("bill");
  const existing = await prisma.transaction.findUnique({ where: { idempotencyKey } });
  if (existing) {
    return { ok: true as const, transaction: serializeTx(existing), replayed: true };
  }

  const amount = opts.amount;
  if (!amount || amount < 50) {
    return { ok: false as const, error: "Invalid amount", status: 400 };
  }

  const orderRef = makeOrderRef();
  const steps: TrailStep[] = [step("PENDING", "Order created")];

  const tx = await prisma.transaction.create({
    data: {
      userId: opts.userId,
      service: opts.service,
      status: "PENDING",
      amount,
      phone: opts.fields.phone || null,
      meterNumber: opts.fields.meterNumber || null,
      smartCardNumber: opts.fields.smartCardNumber || null,
      customerName: opts.fields.customerName || null,
      packageCode: opts.fields.packageCode || null,
      billerId: opts.fields.billerId || null,
      idempotencyKey,
      orderRef,
      isGuest: false,
      statusTrail: trail(steps),
      meta: opts.fields.meta ? JSON.stringify(opts.fields.meta) : null,
    },
  });

  let balanceAfter: number;
  try {
    balanceAfter = await debitWallet({
      userId: opts.userId,
      amount,
      transactionId: tx.id,
      memo: `${opts.service} ${orderRef}`,
    });
  } catch (e) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: "FAILED",
        failureReason: e instanceof WalletError ? e.message : "Wallet error",
        statusTrail: trail([
          ...steps,
          step("FAILED", e instanceof Error ? e.message : "Wallet error"),
        ]),
      },
    });
    if (e instanceof WalletError && e.code === "INSUFFICIENT") {
      return { ok: false as const, error: e.message, status: 402, code: "INSUFFICIENT" };
    }
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Wallet debit failed",
      status: 400,
    };
  }

  steps.push(step("PROCESSING", `Wallet debited · ₦${balanceAfter}`));
  await prisma.transaction.update({
    where: { id: tx.id },
    data: { status: "PROCESSING", statusTrail: trail(steps) },
  });

  const result = await opts.execute(idempotencyKey);
  const provider = await prisma.provider.findUnique({ where: { code: result.providerCode } });

  if (!result.success) {
    const refundBal = await refundToWallet({
      userId: opts.userId,
      amount,
      transactionId: tx.id,
      memo: `Refund ${orderRef}`,
    });
    steps.push(step("FAILED", result.error || "Provider failed"));
    steps.push(step("REFUNDED", `Auto-refund · ₦${refundBal}`));
    const failed = await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: "REFUNDED",
        failureReason: result.error,
        providerId: provider?.id,
        statusTrail: trail(steps),
      },
    });
    return {
      ok: false as const,
      error: result.error || "Delivery failed — wallet refunded",
      status: 502,
      code: "PROVIDER_FAILED",
      transaction: serializeTx(failed),
      balance: refundBal,
    };
  }

  const deliveredToken = result.token || result.pin || null;
  steps.push(step("DELIVERED", result.providerRef || result.providerCode));
  const delivered = await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      status: "DELIVERED",
      providerId: provider?.id,
      providerRef: result.providerRef,
      token: deliveredToken,
      customerName: result.customerName || opts.fields.customerName,
      deliveredAt: new Date(),
      statusTrail: trail(steps),
      cost: amount * 0.95,
    },
  });

  await trackVolumeAndMaybePromote({ userId: opts.userId, amount });
  await awardPurchaseCommission({
    buyerId: opts.userId,
    amount,
    transactionId: delivered.id,
  });

  await prisma.notification.create({
    data: {
      userId: opts.userId,
      transactionId: delivered.id,
      channel: "IN_APP",
      title: `${opts.service} delivered`,
      body: `${orderRef} · ₦${amount.toLocaleString("en-NG")}`,
    },
  });

  try {
    const { invalidate, CacheKeys, CacheTags } = await import("@/lib/cache");
    const { publishRealtime, userChannel, adminChannel } = await import(
      "@/lib/realtime"
    );
    await invalidate([
      CacheKeys.wallet(opts.userId),
      CacheKeys.notifications(opts.userId),
      CacheKeys.analytics(7),
      CacheKeys.analytics(14),
      CacheKeys.analytics(30),
    ]);
    await invalidate([CacheTags.analytics, CacheTags.admin], true);
    await publishRealtime(userChannel(opts.userId), "tx:delivered", {
      orderRef,
      service: opts.service,
    });
    await publishRealtime(adminChannel(), "tx:delivered", { orderRef });
  } catch {
    /* non-fatal */
  }

  return {
    ok: true as const,
    transaction: serializeTx(delivered),
    balance: balanceAfter,
  };
}

export async function purchaseElectricity(input: {
  userId: string;
  billerCode: string;
  meter: string;
  amount: number;
  pin: string;
  customerName?: string;
  idempotencyKey?: string;
}) {
  const meter = input.meter.replace(/\D/g, "");
  if (!/^\d{11}$/.test(meter)) {
    return { ok: false as const, error: "Meter must be 11 digits", status: 400 };
  }
  if (input.amount < 500 || input.amount > 200000) {
    return {
      ok: false as const,
      error: "Electricity amount must be ₦500 – ₦200,000",
      status: 400,
    };
  }

  const biller = await prisma.biller.findFirst({
    where: { code: input.billerCode.toUpperCase(), category: "ELECTRICITY", isActive: true },
  });
  if (!biller) return { ok: false as const, error: "Unknown DisCo", status: 400 };

  return runWalletPurchase({
    userId: input.userId,
    service: "ELECTRICITY",
    amount: input.amount,
    pin: input.pin,
    idempotencyKey: input.idempotencyKey,
    fields: {
      meterNumber: meter,
      customerName: input.customerName,
      billerId: biller.id,
      meta: { disco: biller.code, discoName: biller.name },
    },
    execute: (idem) =>
      vtuRouter.buyToken({
        disco: biller.code,
        meter,
        amount: input.amount,
        idempotencyKey: idem,
      }),
  });
}

export async function purchaseCable(input: {
  userId: string;
  billerCode: string;
  smartCard: string;
  packageCode: string;
  pin: string;
  customerName?: string;
  idempotencyKey?: string;
}) {
  const card = input.smartCard.replace(/\D/g, "");
  if (card.length < 10) {
    return { ok: false as const, error: "Invalid smartcard / IUC number", status: 400 };
  }

  const biller = await prisma.biller.findFirst({
    where: { code: input.billerCode.toUpperCase(), category: "CABLE", isActive: true },
    include: { packages: { where: { isActive: true } } },
  });
  if (!biller) return { ok: false as const, error: "Unknown cable biller", status: 400 };

  const pkg = biller.packages.find((p) => p.code === input.packageCode);
  if (!pkg) return { ok: false as const, error: "Unknown package", status: 400 };

  const amount = Number(pkg.amount);

  return runWalletPurchase({
    userId: input.userId,
    service: "CABLE",
    amount,
    pin: input.pin,
    idempotencyKey: input.idempotencyKey,
    fields: {
      smartCardNumber: card,
      customerName: input.customerName,
      packageCode: pkg.code,
      billerId: biller.id,
      meta: { biller: biller.code, packageName: pkg.name },
    },
    execute: (idem) =>
      vtuRouter.buyCable({
        biller: biller.code,
        smartCard: card,
        packageCode: pkg.code,
        amount,
        idempotencyKey: idem,
      }),
  });
}

export async function purchaseExamPin(input: {
  userId: string;
  billerCode: string;
  pin: string;
  quantity?: number;
  idempotencyKey?: string;
}) {
  const biller = await prisma.biller.findFirst({
    where: { code: input.billerCode.toUpperCase(), category: "EXAM", isActive: true },
    include: { packages: { where: { isActive: true }, take: 1 } },
  });
  if (!biller || !biller.packages[0]) {
    return { ok: false as const, error: "Unknown exam pin product", status: 400 };
  }
  const pkg = biller.packages[0];
  const qty = Math.max(1, Math.min(5, input.quantity || 1));
  const amount = Number(pkg.amount) * qty;

  return runWalletPurchase({
    userId: input.userId,
    service: "EXAM_PIN",
    amount,
    pin: input.pin,
    idempotencyKey: input.idempotencyKey,
    fields: {
      packageCode: pkg.code,
      billerId: biller.id,
      meta: { biller: biller.code, packageName: pkg.name, quantity: qty },
    },
    execute: (idem) =>
      vtuRouter.buyExamPin({
        biller: biller.code,
        quantity: qty,
        amount,
        idempotencyKey: idem,
      }),
  });
}
