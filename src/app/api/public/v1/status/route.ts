import { NextResponse } from "next/server";
import { resolveApiKey, hasScope } from "@/lib/api-keys";
import { prisma } from "@/lib/db";

/** GET /api/public/v1/status?orderRef=DG-... or wallet balance */
export async function GET(req: Request) {
  const auth = await resolveApiKey(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  if (!hasScope(auth.scopes, "status:read") && !hasScope(auth.scopes, "wallet:read")) {
    return NextResponse.json({ error: "Scope status:read or wallet:read required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const orderRef = searchParams.get("orderRef");

  if (orderRef) {
    const tx = await prisma.transaction.findFirst({
      where: { orderRef, userId: auth.userId },
    });
    if (!tx) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      orderRef: tx.orderRef,
      status: tx.status,
      service: tx.service,
      amount: Number(tx.amount),
      phone: tx.phone,
      token: tx.token,
      deliveredAt: tx.deliveredAt,
    });
  }

  const wallet = auth.user.wallets.find((w) => w.kind === "MAIN");
  return NextResponse.json({
    balance: Number(wallet?.balance ?? 0),
    currency: "NGN",
    role: auth.user.role,
  });
}
