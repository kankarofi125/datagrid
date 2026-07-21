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

  const event = JSON.parse(raw);
  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const data = event.data;
  const reference = String(data.reference || "");
  const amountNaira = Number(data.amount || 0) / 100;
  const userId = data.metadata?.userId as string | undefined;

  if (!reference || !userId || !amountNaira) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  const existing = await prisma.transaction.findFirst({
    where: { fundingRef: reference, service: "WALLET_FUND" },
  });
  if (existing?.status === "DELIVERED") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const orderRef = existing?.orderRef || makeOrderRef();
  const tx =
    existing ||
    (await prisma.transaction.create({
      data: {
        userId,
        service: "WALLET_FUND",
        status: "PROCESSING",
        amount: amountNaira,
        idempotencyKey: makeIdempotencyKey("psk_wh"),
        orderRef,
        fundingProvider: "PAYSTACK",
        fundingRef: reference,
        statusTrail: JSON.stringify([
          { at: new Date().toISOString(), status: "PROCESSING", note: "Webhook" },
        ]),
      },
    }));

  await creditWallet({
    userId,
    amount: amountNaira,
    transactionId: tx.id,
    memo: "Paystack webhook",
  });

  await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
      statusTrail: JSON.stringify([
        { at: new Date().toISOString(), status: "DELIVERED", note: reference },
      ]),
    },
  });

  return NextResponse.json({ ok: true });
}
