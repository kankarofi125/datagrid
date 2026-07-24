import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { cached, CacheKeys, CacheTags, invalidate } from "@/lib/cache";
import { publishRealtime, userChannel } from "@/lib/realtime";

export async function GET() {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId;
  const data = await cached(
    CacheKeys.notifications(userId),
    async () => {
      const items = await prisma.notification.findMany({
        where: { userId, channel: "IN_APP" },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      const unread = items.filter((n) => n.status === "UNREAD").length;
      return {
        unread,
        notifications: items.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          status: n.status,
          createdAt: n.createdAt,
          transactionId: n.transactionId,
        })),
        cachedAt: new Date().toISOString(),
      };
    },
    { ttl: 20, staleTtl: 300, tags: [CacheTags.notifications(userId)] }
  );

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, no-store",
      "X-Cache-Layer": "hybrid",
    },
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
    await invalidate(CacheKeys.notifications(session.userId));
    await publishRealtime(userChannel(session.userId), "notifications:read", {
      all: true,
    });
    return NextResponse.json({ ok: true });
  }

  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.notification.updateMany({
    where: { id, userId: session.userId },
    data: { status: "READ" },
  });
  await invalidate(CacheKeys.notifications(session.userId));
  await publishRealtime(userChannel(session.userId), "notifications:read", {
    id,
  });
  return NextResponse.json({ ok: true });
}
