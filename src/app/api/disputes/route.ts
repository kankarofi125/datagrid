import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/** User opens a dispute on their order */
export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const orderRef = String(body.orderRef || "");
  const reason = String(body.reason || "").slice(0, 500);
  if (!orderRef || !reason) {
    return NextResponse.json({ error: "orderRef and reason required" }, { status: 400 });
  }

  const tx = await prisma.transaction.findFirst({
    where: { orderRef, userId: session.userId },
  });
  if (!tx) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const existing = await prisma.dispute.findFirst({
    where: { transactionId: tx.id, status: { in: ["OPEN", "INVESTIGATING"] } },
  });
  if (existing) {
    return NextResponse.json({ error: "Dispute already open", id: existing.id }, { status: 409 });
  }

  const d = await prisma.dispute.create({
    data: {
      userId: session.userId,
      transactionId: tx.id,
      reason,
      status: "OPEN",
    },
  });

  return NextResponse.json({ ok: true, id: d.id });
}
