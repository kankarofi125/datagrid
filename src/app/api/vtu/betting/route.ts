import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { purchaseBetting } from "@/lib/transactions/purchase-bills";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await purchaseBetting({
    userId: session.userId,
    billerCode: String(body.billerCode || ""),
    customerId: String(body.customerId || ""),
    amount: Number(body.amount || 0),
    pin: String(body.pin || ""),
    customerName: body.customerName ? String(body.customerName) : undefined,
    idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey) : undefined,
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
    balance: "balance" in result ? result.balance : undefined,
  });
}
