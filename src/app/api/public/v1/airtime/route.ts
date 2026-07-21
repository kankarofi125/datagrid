import { NextResponse } from "next/server";
import { resolveApiKey, hasScope } from "@/lib/api-keys";
import { purchaseWithWallet } from "@/lib/transactions/purchase";
import { isAgentRole } from "@/lib/commissions";

export async function POST(req: Request) {
  const auth = await resolveApiKey(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  if (!hasScope(auth.scopes, "airtime:buy")) {
    return NextResponse.json({ error: "Scope airtime:buy required" }, { status: 403 });
  }
  if (!isAgentRole(auth.user.role)) {
    return NextResponse.json({ error: "Agent role required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await purchaseWithWallet({
    userId: auth.userId,
    service: "AIRTIME",
    phone: String(body.phone || ""),
    amount: Number(body.amount || 0),
    networkCode: body.networkCode ? String(body.networkCode) : undefined,
    pin: String(body.pin || ""),
    idempotencyKey: body.idempotencyKey
      ? String(body.idempotencyKey)
      : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: "code" in result ? result.code : undefined },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    orderRef: result.transaction.orderRef,
    status: result.transaction.status,
    amount: result.transaction.amount,
    phone: result.transaction.phone,
    balance: result.balance,
  });
}
