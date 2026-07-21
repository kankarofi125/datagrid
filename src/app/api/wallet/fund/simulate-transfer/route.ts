import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";
import { creditWallet } from "@/lib/wallet/service";
import { maybeSignupBonus } from "@/lib/commissions";

/** Dev-only: simulate Monnify bank transfer webhook credit */
export async function POST(req: Request) {
  if (process.env.PAYMENT_MODE !== "simulate" && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
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

  return NextResponse.json({ ok: true, balance, orderRef });
}
