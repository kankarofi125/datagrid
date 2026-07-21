import { prisma } from "@/lib/db";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";
import { detectNetwork, toLocalPhone } from "@/lib/phone";
import { debitWallet, refundToWallet, WalletError } from "@/lib/wallet/service";
import { vtuRouter } from "@/lib/vtu/router";
import { awardPurchaseCommission, trackVolumeAndMaybePromote } from "@/lib/commissions";
import type { TxService } from "@prisma/client";

/** Wallet purchase without PIN — only for trusted schedule runner */
export async function purchaseScheduled(input: {
  userId: string;
  service: "AIRTIME" | "DATA";
  phone: string;
  amount?: number;
  planId?: string;
  networkCode?: string;
}) {
  const local = toLocalPhone(input.phone);
  if (!local) {
    return { ok: false as const, error: "Invalid phone", status: 400 };
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return { ok: false as const, error: "User not found", status: 404 };

  const networkCode = input.networkCode || detectNetwork(local) || undefined;
  let amount = Number(input.amount || 0);
  let planId: string | null = null;
  let planName: string | undefined;
  let providerPlanCode = "DEMO";
  const isAgent =
    user.role === "AGENT" || user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (input.service === "DATA") {
    const plan = input.planId
      ? await prisma.plan.findFirst({
          where: { id: input.planId, isActive: true },
          include: { network: true },
        })
      : null;
    if (!plan) return { ok: false as const, error: "Plan not found", status: 400 };
    amount = isAgent ? Number(plan.resellerPrice) : Number(plan.retailPrice);
    planId = plan.id;
    planName = plan.name;
    providerPlanCode = plan.providerCode || plan.id;
  } else if (!amount || amount < 50) {
    return { ok: false as const, error: "Invalid airtime amount", status: 400 };
  }

  const idempotencyKey = makeIdempotencyKey("sched");
  const orderRef = makeOrderRef();
  const steps = [
    { at: new Date().toISOString(), status: "PENDING", note: "Scheduled run" },
  ];

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
      meta: planName
        ? JSON.stringify({ planName, scheduled: true })
        : JSON.stringify({ scheduled: true }),
      statusTrail: JSON.stringify(steps),
    },
  });

  let balanceAfter: number;
  try {
    balanceAfter = await debitWallet({
      userId: input.userId,
      amount,
      transactionId: tx.id,
      memo: `Scheduled ${input.service}`,
    });
  } catch (e) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: "FAILED",
        failureReason: e instanceof WalletError ? e.message : "Wallet error",
      },
    });
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Wallet error",
      status: 402,
    };
  }

  steps.push({
    at: new Date().toISOString(),
    status: "PROCESSING",
    note: `Debited · ₦${balanceAfter}`,
  });

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
    await refundToWallet({
      userId: input.userId,
      amount,
      transactionId: tx.id,
      memo: `Refund ${orderRef}`,
    });
    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: "REFUNDED",
        failureReason: vtuResult.error,
        providerId: provider?.id,
        statusTrail: JSON.stringify([
          ...steps,
          { at: new Date().toISOString(), status: "REFUNDED", note: vtuResult.error },
        ]),
      },
    });
    return { ok: false as const, error: vtuResult.error || "Failed", status: 502 };
  }

  const delivered = await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      status: "DELIVERED",
      providerId: provider?.id,
      providerRef: vtuResult.providerRef,
      deliveredAt: new Date(),
      statusTrail: JSON.stringify([
        ...steps,
        { at: new Date().toISOString(), status: "DELIVERED", note: "Scheduled success" },
      ]),
    },
  });

  await trackVolumeAndMaybePromote({ userId: input.userId, amount });
  await awardPurchaseCommission({
    buyerId: input.userId,
    amount,
    transactionId: delivered.id,
  });

  return {
    ok: true as const,
    transaction: {
      id: delivered.id,
      orderRef: delivered.orderRef,
      status: delivered.status,
      amount: Number(delivered.amount),
      phone: delivered.phone,
    },
    balance: balanceAfter,
  };
}
