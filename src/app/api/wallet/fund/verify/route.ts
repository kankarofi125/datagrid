import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { queryMonnifyPayment } from "@/lib/payments/monnify";
import { creditWallet } from "@/lib/wallet/service";
import { maybeSignupBonus } from "@/lib/commissions";

/**
 * After Monnify checkout redirect, confirm payment and credit if webhook
 * has not already done so.
 */
export async function GET(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const reference = (url.searchParams.get("reference") || "").trim();
  if (!reference) {
    return NextResponse.json({ error: "reference required" }, { status: 400 });
  }

  const tx = await prisma.transaction.findFirst({
    where: {
      userId: session.userId,
      fundingProvider: "MONNIFY",
      service: "WALLET_FUND",
      OR: [{ fundingRef: reference }, { idempotencyKey: reference }],
    },
  });
  if (!tx) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  if (tx.status === "DELIVERED") {
    return NextResponse.json({ ok: true, alreadyCredited: true, orderRef: tx.orderRef });
  }

  let paid = false;
  let amount = Number(tx.amount);
  try {
    const q = await queryMonnifyPayment(reference);
    paid = q.paid;
    if (q.amount > 0) amount = q.amount;
  } catch (e) {
    console.warn(
      "[wallet/fund/verify] query failed",
      e instanceof Error ? e.message : e
    );
  }

  if (!paid) {
    return NextResponse.json({
      ok: false,
      pending: true,
      orderRef: tx.orderRef,
    });
  }

  const balance = await creditWallet({
    userId: session.userId,
    amount,
    transactionId: tx.id,
    memo: "Monnify checkout",
  });
  await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
      statusTrail: JSON.stringify([
        {
          at: new Date().toISOString(),
          status: "DELIVERED",
          note: reference,
        },
      ]),
    },
  });
  await maybeSignupBonus({ userId: session.userId, transactionId: tx.id });

  try {
    const { emailWalletFunded } = await import("@/lib/email/notify");
    await emailWalletFunded({
      userId: session.userId,
      amount,
      orderRef: tx.orderRef,
      balance,
      method: "Monnify",
    });
  } catch (e) {
    console.error("[wallet/fund/verify] email", e);
  }

  return NextResponse.json({
    ok: true,
    credited: true,
    orderRef: tx.orderRef,
    balance,
  });
}
