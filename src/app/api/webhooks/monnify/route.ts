import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/wallet/service";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";

/**
 * Monnify payment notification webhook.
 * In simulate mode, use /api/wallet/fund/simulate-transfer instead.
 * Production: verify signature with MONNIFY_SECRET_KEY before trusting body.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const eventType = body.eventType || body.eventData?.eventType;

  if (eventType && !String(eventType).includes("SUCCESSFUL")) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const eventData = body.eventData || body;
  const accountNumber = String(
    eventData.destinationAccountNumber || eventData.accountNumber || ""
  );
  const amount = Number(eventData.amountPaid || eventData.amount || 0);
  const paymentRef = String(eventData.paymentReference || eventData.transactionReference || "");

  if (!accountNumber || !amount) {
    return NextResponse.json({ error: "Missing account or amount" }, { status: 400 });
  }

  if (paymentRef) {
    const dup = await prisma.transaction.findFirst({
      where: { fundingRef: paymentRef, service: "WALLET_FUND", status: "DELIVERED" },
    });
    if (dup) return NextResponse.json({ ok: true, duplicate: true });
  }

  const va = await prisma.virtualAccount.findFirst({
    where: { accountNumber, isActive: true },
  });
  if (!va) {
    return NextResponse.json({ error: "Unknown virtual account" }, { status: 404 });
  }

  const orderRef = makeOrderRef();
  const tx = await prisma.transaction.create({
    data: {
      userId: va.userId,
      service: "WALLET_FUND",
      status: "DELIVERED",
      amount,
      idempotencyKey: makeIdempotencyKey("mon_wh"),
      orderRef,
      fundingProvider: "MONNIFY",
      fundingRef: paymentRef || orderRef,
      deliveredAt: new Date(),
      statusTrail: JSON.stringify([
        { at: new Date().toISOString(), status: "DELIVERED", note: "Monnify webhook" },
      ]),
    },
  });

  await creditWallet({
    userId: va.userId,
    amount,
    transactionId: tx.id,
    memo: "Monnify transfer",
  });

  return NextResponse.json({ ok: true, orderRef });
}
