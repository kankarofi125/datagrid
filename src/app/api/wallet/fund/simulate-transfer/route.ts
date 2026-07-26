import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";
import { creditWallet } from "@/lib/wallet/service";
import { maybeSignupBonus } from "@/lib/commissions";
import { CacheTags, invalidate } from "@/lib/cache";

/**
 * Simulate Monnify bank transfer credit for the logged-in user.
 * Allowed when PAYMENT_MODE=simulate (including Vercel until live payments).
 * Not available when payments are live.
 */
export async function POST(req: Request) {
  const { isPaymentSimulateMode } = await import("@/lib/payments/simulator");
  if (!isPaymentSimulateMode()) {
    return NextResponse.json(
      {
        error:
          "Simulated transfers are only available when PAYMENT_MODE=simulate",
      },
      { status: 403 }
    );
  }

  const { requireUser } = await import("@/lib/auth/session");
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount || 0);
  if (!amount || amount < 100) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const orderRef = makeOrderRef();
  const idem = makeIdempotencyKey("mon");

  const tx = await prisma.transaction.create({
    data: {
      userId: session.userId,
      service: "WALLET_FUND",
      status: "DELIVERED",
      amount,
      idempotencyKey: idem,
      orderRef,
      fundingProvider: "MONNIFY",
      deliveredAt: new Date(),
      statusTrail: JSON.stringify([
        {
          at: new Date().toISOString(),
          status: "DELIVERED",
          note: "Sim VA credit webhook",
        },
      ]),
    },
  });

  const balance = await creditWallet({
    userId: session.userId,
    amount,
    transactionId: tx.id,
    memo: "Monnify transfer (sim)",
  });

  await maybeSignupBonus({ userId: session.userId, transactionId: tx.id });

  await prisma.notification.create({
    data: {
      userId: session.userId,
      transactionId: tx.id,
      title: "Wallet funded",
      body: `₦${amount.toLocaleString("en-NG")} via Monnify · ${orderRef}`,
      channel: "IN_APP",
    },
  });
  await invalidate(CacheTags.notifications(session.userId), true).catch(() => {});

  try {
    const { emailWalletFunded } = await import("@/lib/email/notify");
    await emailWalletFunded({
      userId: session.userId!,
      amount,
      orderRef,
      balance,
      method: "Monnify",
    });
  } catch (e) {
    console.error("[wallet/fund/sim] monnify email", e);
  }

  return NextResponse.json({ ok: true, balance, orderRef });
}
