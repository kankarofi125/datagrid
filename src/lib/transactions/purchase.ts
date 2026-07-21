import { prisma } from "@/lib/db";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";
import { detectNetwork, toLocalPhone } from "@/lib/phone";
import { debitWallet, refundToWallet, WalletError } from "@/lib/wallet/service";
import { vtuRouter } from "@/lib/vtu/router";
import { verifyPin } from "@/lib/auth/pin";
import {
  awardPurchaseCommission,
  trackVolumeAndMaybePromote,
} from "@/lib/commissions";
import type { TxService } from "@prisma/client";

export type PurchaseInput = {
  userId: string;
  service: "AIRTIME" | "DATA";
  phone: string;
  amount?: number;
  planId?: string;
  networkCode?: string;
  pin: string;
  idempotencyKey?: string;
};

type TrailStep = { at: string; status: string; note?: string };

function trail(steps: TrailStep[]) {
  return JSON.stringify(steps);
}

function step(status: string, note?: string): TrailStep {
  return { at: new Date().toISOString(), status, note };
}

export async function purchaseWithWallet(input: PurchaseInput) {
  const local = toLocalPhone(input.phone);
  if (!local) {
    return { ok: false as const, error: "Invalid Nigerian phone number", status: 400 };
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    return { ok: false as const, error: "User not found", status: 404 };
  }

  if (!user.pinHash) {
    return {
      ok: false as const,
      error: "Set a 4-digit transaction PIN in Settings first",
      status: 400,
      code: "PIN_REQUIRED",
    };
  }

  const pinOk = await verifyPin(input.pin, user.pinHash);
  if (!pinOk) {
    return { ok: false as const, error: "Incorrect transaction PIN", status: 401 };
  }

  const idempotencyKey = input.idempotencyKey || makeIdempotencyKey("buy");
  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return {
      ok: true as const,
      transaction: serializeTx(existing),
      replayed: true,
    };
  }

  const networkCode =
    input.networkCode || detectNetwork(local) || undefined;

  let amount = Number(input.amount || 0);
  let planId: string | null = null;
  let planName: string | undefined;
  let providerPlanCode = "DEMO";

  if (input.service === "DATA") {
    const plan = input.planId
      ? await prisma.plan.findFirst({
          where: {
            OR: [{ id: input.planId }, { providerCode: input.planId }],
            isActive: true,
          },
          include: { network: true },
        })
      : null;
    if (!plan) {
      return { ok: false as const, error: "Select a valid data plan", status: 400 };
    }
    // Agents get reseller price
    const isAgent = user.role === "AGENT" || user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    amount = isAgent ? Number(plan.resellerPrice) : Number(plan.retailPrice);
    planId = plan.id;
    planName = plan.name;
    providerPlanCode = plan.providerCode || plan.id;
  } else {
    if (!amount || amount < 50 || amount > 100_000) {
      return {
        ok: false as const,
        error: "Airtime must be between ₦50 and ₦100,000",
        status: 400,
      };
    }
  }

  const orderRef = makeOrderRef();
  const steps: TrailStep[] = [step("PENDING", "Order created")];

  // Create PENDING tx first (no debit yet — we need tx id for ledger link)
  const tx = await prisma.transaction.create({
    data: {
      userId: input.userId,
      service: input.service as TxService,
      status: "PENDING",
      amount,
      phone: local,
      networkCode: networkCode ? String(networkCode) : null,
      planId,
      idempotencyKey,
      orderRef,
      isGuest: false,
      statusTrail: trail(steps),
      meta: planName ? JSON.stringify({ planName }) : null,
    },
  });

  // Debit wallet
  let balanceAfter: number;
  try {
    balanceAfter = await debitWallet({
      userId: input.userId,
      amount,
      transactionId: tx.id,
      memo: `${input.service} ${local}`,
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
      return {
        ok: false as const,
        error: e.message,
        status: 402,
        code: "INSUFFICIENT",
      };
    }
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Wallet debit failed",
      status: 400,
    };
  }

  steps.push(step("PROCESSING", `Wallet debited · balance ₦${balanceAfter}`));
  await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      status: "PROCESSING",
      statusTrail: trail(steps),
    },
  });

  // VTU provider
  const vtuResult =
    input.service === "DATA"
      ? await vtuRouter.buyData({
          network: String(networkCode || "MTN"),
          phone: local,
          planCode: providerPlanCode,
          amount,
          idempotencyKey,
        })
      : await vtuRouter.buyAirtime({
          network: String(networkCode || "MTN"),
          phone: local,
          amount,
          idempotencyKey,
        });

  const provider = await prisma.provider.findUnique({
    where: { code: vtuResult.providerCode },
  });

  if (!vtuResult.success) {
    // Auto-refund
    const refundBal = await refundToWallet({
      userId: input.userId,
      amount,
      transactionId: tx.id,
      memo: `Refund ${orderRef}`,
    });
    steps.push(step("FAILED", vtuResult.error || "Provider failed"));
    steps.push(step("REFUNDED", `Auto-refund · balance ₦${refundBal}`));
    const failed = await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: "REFUNDED",
        failureReason: vtuResult.error,
        providerId: provider?.id,
        statusTrail: trail(steps),
      },
    });
    return {
      ok: false as const,
      error: vtuResult.error || "Delivery failed — wallet refunded",
      status: 502,
      code: "PROVIDER_FAILED",
      transaction: serializeTx(failed),
      balance: refundBal,
    };
  }

  steps.push(step("DELIVERED", vtuResult.providerRef || vtuResult.providerCode));
  const delivered = await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      status: "DELIVERED",
      providerId: provider?.id,
      providerRef: vtuResult.providerRef,
      token: vtuResult.token,
      deliveredAt: new Date(),
      statusTrail: trail(steps),
      cost: amount * 0.92, // rough provider cost for analytics
    },
  });

  await trackVolumeAndMaybePromote({ userId: input.userId, amount });
  await awardPurchaseCommission({
    buyerId: input.userId,
    amount,
    transactionId: delivered.id,
  });

  // In-app notification
  await prisma.notification.create({
    data: {
      userId: input.userId,
      transactionId: delivered.id,
      channel: "IN_APP",
      title: `${input.service} delivered`,
      body: `${planName || formatService(input.service)} to ${local} · ${orderRef}`,
    },
  });

  return {
    ok: true as const,
    transaction: serializeTx(delivered),
    balance: balanceAfter,
    ussdHint: await ussdForNetwork(networkCode),
  };
}

function formatService(s: string) {
  return s === "DATA" ? "Data" : "Airtime";
}

async function ussdForNetwork(code?: string | null) {
  if (!code) return null;
  const n = await prisma.network.findUnique({ where: { code: String(code) } });
  return n?.ussdBalance || null;
}

function serializeTx(t: {
  id: string;
  orderRef: string;
  status: string;
  service: string;
  amount: unknown;
  phone: string | null;
  networkCode: string | null;
  token: string | null;
  statusTrail: string;
  deliveredAt: Date | null;
  failureReason: string | null;
  meta: string | null;
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
    token: t.token,
    statusTrail: trailParsed,
    deliveredAt: t.deliveredAt,
    failureReason: t.failureReason,
    meta,
  };
}
