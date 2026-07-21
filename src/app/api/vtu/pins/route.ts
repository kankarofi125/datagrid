import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { purchaseExamPin } from "@/lib/transactions/purchase-bills";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await purchaseExamPin({
    userId: session.userId,
    billerCode: String(body.billerCode || ""),
    pin: String(body.pin || ""),
    quantity: body.quantity ? Number(body.quantity) : 1,
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
