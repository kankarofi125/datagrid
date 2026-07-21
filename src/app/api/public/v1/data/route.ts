import { NextResponse } from "next/server";
import { resolveApiKey, hasScope } from "@/lib/api-keys";
import { purchaseWithWallet } from "@/lib/transactions/purchase";
import { prisma } from "@/lib/db";
import { isAgentRole } from "@/lib/commissions";

/**
 * Reseller API: POST /api/public/v1/data
 * Authorization: Bearer dg_live_...
 * Body: { phone, planId | planCode, pin, idempotencyKey? }
 *
 * Note: pin is required for wallet debit security even on API keys.
 * Agents may automate with a dedicated automation pin set on their account.
 */
export async function POST(req: Request) {
  const auth = await resolveApiKey(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  if (!hasScope(auth.scopes, "data:buy")) {
    return NextResponse.json({ error: "Scope data:buy required" }, { status: 403 });
  }
  if (!isAgentRole(auth.user.role)) {
    return NextResponse.json({ error: "Agent role required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  let planId = body.planId ? String(body.planId) : undefined;
  if (!planId && body.planCode) {
    const plan = await prisma.plan.findFirst({
      where: { providerCode: String(body.planCode), isActive: true },
    });
    planId = plan?.id;
  }

  const result = await purchaseWithWallet({
    userId: auth.userId,
    service: "DATA",
    phone: String(body.phone || ""),
    planId,
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
