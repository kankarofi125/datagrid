import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/wallet/service";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";
import { verifyMonnifyWebhook } from "@/lib/payments/monnify";

/**
 * Monnify payment notification webhook.
 * Requires signature verification. Requires unique paymentReference.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const signatureHeader =
    req.headers.get("monnify-signature") ||
    req.headers.get("x-monnify-signature") ||
    null;
  const eventData = (body.eventData || body) as Record<string, unknown>;
  const computeHash =
    (typeof body.computeHash === "string" && body.computeHash) ||
    (typeof eventData.transactionHash === "string" &&
      eventData.transactionHash) ||
    null;

  if (
    !verifyMonnifyWebhook({
      rawBody: raw,
      signatureHeader,
      computeHash,
    })
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventType = String(
    body.eventType || eventData.eventType || ""
  );
  if (eventType && !eventType.toUpperCase().includes("SUCCESSFUL")) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const accountNumber = String(
    eventData.destinationAccountNumber || eventData.accountNumber || ""
  );
  const amount = Number(eventData.amountPaid || eventData.amount || 0);
  const paymentRef = String(
    eventData.paymentReference || eventData.transactionReference || ""
  ).trim();

  if (!accountNumber || !amount || amount <= 0) {
    return NextResponse.json(
      { error: "Missing account or amount" },
      { status: 400 }
    );
  }
  if (!paymentRef) {
    return NextResponse.json(
      { error: "paymentReference required" },
      { status: 400 }
    );
  }

  const dup = await prisma.transaction.findFirst({
    where: {
      fundingRef: paymentRef,
      fundingProvider: "MONNIFY",
      service: "WALLET_FUND",
    },
  });
  if (dup?.status === "DELIVERED") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const va = await prisma.virtualAccount.findFirst({
    where: { accountNumber, isActive: true },
  });
  if (!va) {
    return NextResponse.json({ error: "Unknown virtual account" }, { status: 404 });
  }

  const orderRef = dup?.orderRef || makeOrderRef();
  let tx = dup;
  if (!tx) {
    try {
      tx = await prisma.transaction.create({
        data: {
          userId: va.userId,
          service: "WALLET_FUND",
          status: "PROCESSING",
          amount,
          idempotencyKey: makeIdempotencyKey("mon_wh"),
          orderRef,
          fundingProvider: "MONNIFY",
          fundingRef: paymentRef,
          statusTrail: JSON.stringify([
            {
              at: new Date().toISOString(),
              status: "PROCESSING",
              note: "Monnify webhook",
            },
          ]),
        },
      });
    } catch {
      // Unique race — treat as duplicate
      const again = await prisma.transaction.findFirst({
        where: { fundingRef: paymentRef, fundingProvider: "MONNIFY" },
      });
      if (again?.status === "DELIVERED") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      throw new Error("Could not create funding transaction");
    }
  }

  const balance = await creditWallet({
    userId: va.userId,
    amount,
    transactionId: tx.id,
    memo: "Monnify transfer",
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
          note: paymentRef,
        },
      ]),
    },
  });

  try {
    const { emailWalletFunded } = await import("@/lib/email/notify");
    await emailWalletFunded({
      userId: va.userId,
      amount,
      orderRef,
      balance,
      method: "Monnify",
    });
  } catch (e) {
    console.error("[webhooks/monnify] email", e);
  }

  return NextResponse.json({ ok: true, orderRef });
}
