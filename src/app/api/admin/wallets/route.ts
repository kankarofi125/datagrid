import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { creditWallet } from "@/lib/wallet/service";
import { makeIdempotencyKey, makeOrderRef } from "@/lib/order-ref";

export async function GET() {
  const { error } = await adminGate();
  if (error) return error;

  const requests = await prisma.walletCreditRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  // Attach user phones
  const userIds = [...new Set(requests.map((r) => r.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, phoneLocal: true, name: true },
  });
  const map = Object.fromEntries(users.map((u) => [u.id, u]));

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      phone: map[r.userId]?.phoneLocal,
      name: map[r.userId]?.name,
      amount: Number(r.amount),
      reason: r.reason,
      status: r.status,
      requestedBy: r.requestedBy,
      approvedBy: r.approvedBy,
      createdAt: r.createdAt,
    })),
  });
}

/** Create credit request (first approval step) */
export async function POST(req: Request) {
  const { session, error } = await adminGate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || "").replace(/\D/g, "");
  const amount = Number(body.amount || 0);
  const reason = String(body.reason || "Manual credit").slice(0, 200);

  if (!amount || amount < 1) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const local = phone.startsWith("0")
    ? phone
    : phone.startsWith("234")
      ? `0${phone.slice(3)}`
      : `0${phone}`;
  const e164 = `+234${local.slice(1)}`;

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ phoneLocal: local }, { phone: e164 }, { phoneLocal: phone }, { phone: phone }],
    },
  });
  if (!user && body.userId) {
    user = await prisma.user.findUnique({ where: { id: String(body.userId) } });
  }
  if (!user) {
    return NextResponse.json(
      { error: `User not found for ${local}` },
      { status: 404 }
    );
  }

  const row = await prisma.walletCreditRequest.create({
    data: {
      userId: user.id,
      amount,
      reason,
      requestedBy: session!.userId!,
      status: "PENDING",
    },
  });

  await writeAudit({
    actorId: session!.userId,
    action: "WALLET_CREDIT_REQUEST",
    entityType: "WalletCreditRequest",
    entityId: row.id,
    after: { amount, userId: user.id, reason },
  });

  return NextResponse.json({
    ok: true,
    request: { id: row.id, status: row.status, amount },
    note: "Awaiting second admin approval",
  });
}

/** Approve or reject — dual approval: approver must differ from requester */
export async function PATCH(req: Request) {
  const { session, error } = await adminGate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const decision = String(body.decision || "").toUpperCase();

  const row = await prisma.walletCreditRequest.findUnique({ where: { id } });
  if (!row || row.status !== "PENDING") {
    return NextResponse.json({ error: "Request not pending" }, { status: 400 });
  }

  if (decision === "REJECT") {
    await prisma.walletCreditRequest.update({
      where: { id },
      data: { status: "REJECTED", rejectedBy: session!.userId, note: body.note },
    });
    await writeAudit({
      actorId: session!.userId,
      action: "WALLET_CREDIT_REJECT",
      entityType: "WalletCreditRequest",
      entityId: id,
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  if (decision !== "APPROVE") {
    return NextResponse.json({ error: "decision must be APPROVE or REJECT" }, { status: 400 });
  }

  // Dual approval: different admin required (skip in single-admin dev if same)
  const force = body.force === true && process.env.NODE_ENV !== "production";
  if (row.requestedBy === session!.userId && !force) {
    return NextResponse.json(
      {
        error: "Dual approval required — a different admin must approve",
        code: "DUAL_APPROVAL",
      },
      { status: 409 }
    );
  }

  const amount = Number(row.amount);
  const orderRef = makeOrderRef();
  const tx = await prisma.transaction.create({
    data: {
      userId: row.userId,
      service: "WALLET_FUND",
      status: "DELIVERED",
      amount,
      idempotencyKey: makeIdempotencyKey("adm"),
      orderRef,
      deliveredAt: new Date(),
      meta: JSON.stringify({ manual: true, creditRequestId: id }),
      statusTrail: JSON.stringify([
        {
          at: new Date().toISOString(),
          status: "DELIVERED",
          note: "Manual credit approved",
        },
      ]),
    },
  });

  const balance = await creditWallet({
    userId: row.userId,
    amount,
    transactionId: tx.id,
    memo: `Manual credit · ${row.reason}`,
  });

  await prisma.walletCreditRequest.update({
    where: { id },
    data: { status: "APPROVED", approvedBy: session!.userId },
  });

  await writeAudit({
    actorId: session!.userId,
    action: "WALLET_CREDIT_APPROVE",
    entityType: "WalletCreditRequest",
    entityId: id,
    after: { amount, balance, orderRef },
  });

  await prisma.notification.create({
    data: {
      userId: row.userId,
      transactionId: tx.id,
      title: "Wallet credited",
      body: `₦${amount.toLocaleString("en-NG")} manual credit · ${orderRef}`,
      channel: "IN_APP",
    },
  });

  return NextResponse.json({ ok: true, status: "APPROVED", orderRef, balance });
}
