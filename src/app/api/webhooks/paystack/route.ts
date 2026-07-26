import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPaystackSignature } from "@/lib/payments/paystack";
import { creditWallet } from "@/lib/wallet/service";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  if (!(await verifyPaystackSignature(raw, signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    data?: {
      reference?: string;
      amount?: number;
      metadata?: { userId?: string };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const data = event.data || {};
  const reference = String(data.reference || "").trim();
  const amountNaira = Number(data.amount || 0) / 100;
  const userId = data.metadata?.userId as string | undefined;

  if (!reference || !userId || !amountNaira || amountNaira <= 0) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  });
  if (!user?.isActive) {
    return NextResponse.json({ error: "User not fundable" }, { status: 400 });
  }

  const existing = await prisma.transaction.findFirst({
    where: { fundingRef: reference, fundingProvider: "PAYSTACK" },
  });
  if (existing?.status === "DELIVERED") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Prefer amount on existing pending row if present
  const creditAmount = existing
    ? Number(existing.amount)
    : amountNaira;

  const orderRef = existing?.orderRef || makeOrderRef();
  let tx = existing;
  if (!tx) {
    try {
      tx = await prisma.transaction.create({
        data: {
          userId,
          service: "WALLET_FUND",
          status: "PROCESSING",
          amount: creditAmount,
          idempotencyKey: makeIdempotencyKey("psk_wh"),
          orderRef,
          fundingProvider: "PAYSTACK",
          fundingRef: reference,
          statusTrail: JSON.stringify([
            {
              at: new Date().toISOString(),
              status: "PROCESSING",
              note: "Webhook",
            },
          ]),
        },
      });
    } catch {
      const again = await prisma.transaction.findFirst({
        where: { fundingRef: reference, fundingProvider: "PAYSTACK" },
      });
      if (again?.status === "DELIVERED") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      return NextResponse.json({ error: "Could not create tx" }, { status: 500 });
    }
  }

  const balance = await creditWallet({
    userId,
    amount: creditAmount,
    transactionId: tx.id,
    memo: "Paystack webhook",
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

  try {
    const { emailWalletFunded } = await import("@/lib/email/notify");
    await emailWalletFunded({
      userId,
      amount: creditAmount,
      orderRef,
      balance,
      method: "Paystack",
    });
  } catch (e) {
    console.error("[webhooks/paystack] email", e);
  }

  return NextResponse.json({ ok: true });
}
