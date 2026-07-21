import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { purchaseWithWallet } from "@/lib/transactions/purchase";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await purchaseWithWallet({
    userId: session.userId,
    service: "DATA",
    phone: String(body.phone || ""),
    planId: body.planId ? String(body.planId) : undefined,
    networkCode: body.networkCode ? String(body.networkCode) : undefined,
    pin: String(body.pin || ""),
    idempotencyKey: body.idempotencyKey
      ? String(body.idempotencyKey)
      : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        code: "code" in result ? result.code : undefined,
        transaction: "transaction" in result ? result.transaction : undefined,
        balance: "balance" in result ? result.balance : undefined,
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    transaction: result.transaction,
    balance: result.balance,
    ussdHint: result.ussdHint,
    replayed: result.replayed,
  });
}
