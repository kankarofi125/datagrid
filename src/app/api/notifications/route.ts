import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.notification.findMany({
    where: { userId: session.userId, channel: "IN_APP" },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unread = items.filter((n) => n.status === "UNREAD").length;

  return NextResponse.json({
    unread,
    notifications: items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      status: n.status,
      createdAt: n.createdAt,
      transactionId: n.transactionId,
    })),
  });
}

export async function PATCH(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: session.userId, status: "UNREAD" },
      data: { status: "READ" },
    });
    return NextResponse.json({ ok: true });
  }

  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.notification.updateMany({
    where: { id, userId: session.userId },
    data: { status: "READ" },
  });
  return NextResponse.json({ ok: true });
}
