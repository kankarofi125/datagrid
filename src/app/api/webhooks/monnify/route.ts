import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/wallet/service";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";
import { queryMonnifyPayment, verifyMonnifyWebhook } from "@/lib/payments/monnify";

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

  const auth = verifyMonnifyWebhook({
    rawBody: raw,
    signatureHeader,
  });
  if (auth === "reject") {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventType = String(
    body.eventType || eventData.eventType || ""
  );
  if (eventType && !eventType.toUpperCase().includes("SUCCESSFUL")) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const destination = (eventData.destinationAccountInformation ||
    {}) as Record<string, unknown>;
  const accountNumber = String(
    eventData.destinationAccountNumber ||
      eventData.accountNumber ||
      destination.accountNumber ||
      ""
  );
  const amount = Number(eventData.amountPaid || eventData.amount || 0);
  const paymentRef = String(
    eventData.paymentReference || eventData.transactionReference || ""
  ).trim();

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { error: "Missing amount" },
      { status: 400 }
    );
  }
  if (!paymentRef) {
    return NextResponse.json(
      { error: "paymentReference required" },
      { status: 400 }
    );
  }

  // Sandbox webhooks are unsigned. Confirm with Monnify before crediting.
  if (auth === "sandbox-unsigned") {
    try {
      const queried = await queryMonnifyPayment(paymentRef);
      if (!queried.paid) {
        return NextResponse.json(
          { ok: true, ignored: true, reason: "not-paid" },
          { status: 200 }
        );
      }
    } catch (e) {
      console.error(
        "[webhooks/monnify] sandbox confirm failed",
        e instanceof Error ? e.message : e
      );
      return NextResponse.json(
        { error: "Could not confirm payment with Monnify" },
        { status: 502 }
      );
    }
  }

  const dup = await prisma.transaction.findFirst({
    where: {
      OR: [
        { fundingRef: paymentRef, fundingProvider: "MONNIFY" },
        { idempotencyKey: paymentRef, fundingProvider: "MONNIFY" },
      ],
      service: "WALLET_FUND",
    },
  });
  if (dup?.status === "DELIVERED") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const va = accountNumber
    ? await prisma.virtualAccount.findFirst({
        where: { accountNumber, isActive: true },
      })
    : null;

  const userId = dup?.userId || va?.userId;
  if (!userId) {
    return NextResponse.json(
      { error: "Unknown payment or virtual account" },
      { status: 404 }
    );
  }

  const orderRef = dup?.orderRef || makeOrderRef();
  let tx = dup;
  if (!tx) {
    try {
      tx = await prisma.transaction.create({
        data: {
          userId,
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
    userId,
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
      userId,
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
