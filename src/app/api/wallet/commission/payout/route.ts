import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { debitWallet, creditWallet, WalletError } from "@/lib/wallet/service";
import { verifyPin } from "@/lib/auth/pin";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";

/** Move commission wallet → main wallet */
export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const pin = String(body.pin || "");
  let amount = Number(body.amount || 0);

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.pinHash) {
    return NextResponse.json({ error: "Set transaction PIN first" }, { status: 400 });
  }
  if (!(await verifyPin(pin, user.pinHash))) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  const commission = await prisma.wallet.findUnique({
    where: { userId_kind: { userId: session.userId, kind: "COMMISSION" } },
  });
  const available = Number(commission?.balance ?? 0);
  if (amount <= 0) amount = available;
  if (amount < 1 || amount > available) {
    return NextResponse.json(
      { error: `Available commission: ₦${available.toLocaleString("en-NG")}` },
      { status: 400 }
    );
  }

  try {
    const orderRef = makeOrderRef();
    const tx = await prisma.transaction.create({
      data: {
        userId: session.userId,
        service: "COMMISSION_PAYOUT",
        status: "DELIVERED",
        amount,
        idempotencyKey: makeIdempotencyKey("cmp"),
        orderRef,
        deliveredAt: new Date(),
        statusTrail: JSON.stringify([
          {
            at: new Date().toISOString(),
            status: "DELIVERED",
            note: "Commission → main",
          },
        ]),
      },
    });

    await debitWallet({
      userId: session.userId,
      amount,
      kind: "COMMISSION",
      transactionId: tx.id,
      memo: "Commission payout",
    });
    const mainBalance = await creditWallet({
      userId: session.userId,
      amount,
      kind: "MAIN",
      transactionId: tx.id,
      memo: "Commission payout",
    });

    return NextResponse.json({
      ok: true,
      orderRef,
      amount,
      balance: mainBalance,
    });
  } catch (e) {
    if (e instanceof WalletError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Payout failed" }, { status: 500 });
  }
}
