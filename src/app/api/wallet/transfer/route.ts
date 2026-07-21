import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { debitWallet, creditWallet, WalletError } from "@/lib/wallet/service";
import { toLocalPhone, toE164 } from "@/lib/phone";
import { verifyPin } from "@/lib/auth/pin";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";

/** Wallet → wallet transfer by phone */
export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount || 0);
  const pin = String(body.pin || "");
  const local = toLocalPhone(String(body.phone || ""));
  const e164 = local ? toE164(local) : null;

  if (!local || !e164) {
    return NextResponse.json({ error: "Invalid recipient phone" }, { status: 400 });
  }
  if (!amount || amount < 50) {
    return NextResponse.json({ error: "Minimum transfer is ₦50" }, { status: 400 });
  }

  const sender = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!sender?.pinHash) {
    return NextResponse.json({ error: "Set transaction PIN first" }, { status: 400 });
  }
  if (!(await verifyPin(pin, sender.pinHash))) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  const recipient = await prisma.user.findFirst({
    where: { OR: [{ phoneLocal: local }, { phone: e164 }] },
  });
  if (!recipient) {
    return NextResponse.json(
      { error: "Recipient has no DataGrid account. Ask them to sign up." },
      { status: 404 }
    );
  }
  if (recipient.id === sender.id) {
    return NextResponse.json({ error: "Cannot transfer to yourself" }, { status: 400 });
  }

  const orderRef = makeOrderRef();
  const idem = makeIdempotencyKey("xfer");

  try {
    const txOut = await prisma.transaction.create({
      data: {
        userId: sender.id,
        service: "WALLET_TRANSFER",
        status: "PROCESSING",
        amount,
        phone: local,
        idempotencyKey: idem,
        orderRef,
        meta: JSON.stringify({ toUserId: recipient.id, direction: "OUT" }),
        statusTrail: JSON.stringify([
          { at: new Date().toISOString(), status: "PROCESSING", note: "Transfer out" },
        ]),
      },
    });

    const balanceAfter = await debitWallet({
      userId: sender.id,
      amount,
      transactionId: txOut.id,
      memo: `Transfer to ${local}`,
    });

    await creditWallet({
      userId: recipient.id,
      amount,
      transactionId: txOut.id,
      memo: `Transfer from ${sender.phoneLocal}`,
    });

    await prisma.transaction.update({
      where: { id: txOut.id },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        statusTrail: JSON.stringify([
          { at: new Date().toISOString(), status: "DELIVERED", note: `To ${local}` },
        ]),
      },
    });

    // Mirror credit record for recipient history
    await prisma.transaction.create({
      data: {
        userId: recipient.id,
        service: "WALLET_TRANSFER",
        status: "DELIVERED",
        amount,
        phone: sender.phoneLocal,
        idempotencyKey: makeIdempotencyKey("xferin"),
        orderRef: makeOrderRef(),
        deliveredAt: new Date(),
        meta: JSON.stringify({ fromUserId: sender.id, direction: "IN", pair: orderRef }),
        statusTrail: JSON.stringify([
          { at: new Date().toISOString(), status: "DELIVERED", note: "Transfer in" },
        ]),
      },
    });

    await prisma.notification.create({
      data: {
        userId: recipient.id,
        title: "Wallet transfer received",
        body: `₦${amount.toLocaleString("en-NG")} from ${sender.phoneLocal}`,
        channel: "IN_APP",
      },
    });

    return NextResponse.json({
      ok: true,
      orderRef,
      balance: balanceAfter,
      recipient: local,
    });
  } catch (e) {
    if (e instanceof WalletError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.code === "INSUFFICIENT" ? 402 : 400 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Transfer failed" },
      { status: 500 }
    );
  }
}
