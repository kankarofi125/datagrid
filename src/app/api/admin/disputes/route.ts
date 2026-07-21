import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { refundToWallet } from "@/lib/wallet/service";

export async function GET() {
  const { error } = await adminGate();
  if (error) return error;

  const disputes = await prisma.dispute.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { phoneLocal: true, name: true } },
      transaction: {
        select: { orderRef: true, amount: true, status: true, service: true },
      },
    },
  });

  return NextResponse.json({
    disputes: disputes.map((d) => ({
      id: d.id,
      reason: d.reason,
      status: d.status,
      resolution: d.resolution,
      createdAt: d.createdAt,
      userPhone: d.user.phoneLocal,
      orderRef: d.transaction.orderRef,
      amount: Number(d.transaction.amount),
      txStatus: d.transaction.status,
      service: d.transaction.service,
    })),
  });
}

export async function POST(req: Request) {
  const { session, error } = await adminGate();
  if (error) return error;

  // Admin can also open dispute by order ref, or resolve
  const body = await req.json().catch(() => ({}));
  if (body.action === "open") {
    const orderRef = String(body.orderRef || "");
    const tx = await prisma.transaction.findUnique({ where: { orderRef } });
    if (!tx || !tx.userId) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    const d = await prisma.dispute.create({
      data: {
        userId: tx.userId,
        transactionId: tx.id,
        reason: String(body.reason || "Customer complaint"),
        status: "OPEN",
      },
    });
    await writeAudit({
      actorId: session!.userId,
      action: "DISPUTE_OPEN",
      entityType: "Dispute",
      entityId: d.id,
    });
    return NextResponse.json({ ok: true, id: d.id });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function PATCH(req: Request) {
  const { session, error } = await adminGate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const status = String(body.status || "").toUpperCase();
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: { transaction: true },
  });
  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (status === "RESOLVED" && body.refund) {
    if (dispute.transaction.userId && dispute.transaction.status === "DELIVERED") {
      await refundToWallet({
        userId: dispute.transaction.userId,
        amount: Number(dispute.transaction.amount),
        transactionId: dispute.transaction.id,
        memo: `Dispute refund ${dispute.transaction.orderRef}`,
      });
      await prisma.transaction.update({
        where: { id: dispute.transactionId },
        data: { status: "REFUNDED" },
      });
    }
  }

  await prisma.dispute.update({
    where: { id },
    data: {
      status: status as "OPEN" | "INVESTIGATING" | "RESOLVED" | "REJECTED",
      resolution: body.resolution ? String(body.resolution) : dispute.resolution,
      resolvedBy: session!.userId,
    },
  });

  await writeAudit({
    actorId: session!.userId,
    action: "DISPUTE_UPDATE",
    entityType: "Dispute",
    entityId: id,
    after: { status, refund: Boolean(body.refund) },
  });

  return NextResponse.json({ ok: true });
}
