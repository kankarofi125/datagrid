import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createApiKey } from "@/lib/api-keys";
import { isAgentRole } from "@/lib/commissions";
import { cached, CacheKeys, CacheTags, CacheTTL, invalidate } from "@/lib/cache";
import { privateJson } from "@/lib/http-cache";

export async function GET() {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !isAgentRole(user.role)) {
    return NextResponse.json(
      { error: "Agent tier required for API keys" },
      { status: 403 }
    );
  }

  const data = await cached(
    CacheKeys.agentKeys(session.userId),
    async () => {
      const keys = await prisma.apiKey.findMany({
        where: { userId: session.userId, revokedAt: null },
        orderBy: { createdAt: "desc" },
      });

      return {
        keys: keys.map((key) => ({
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          scopes: JSON.parse(key.scopes) as string[],
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt,
        })),
      };
    },
    { ttl: CacheTTL.user, tags: [CacheTags.agentKeys(session.userId)] }
  );

  return privateJson(data);
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !isAgentRole(user.role)) {
    return NextResponse.json(
      { error: "Agent tier required. Hit lifetime volume threshold to unlock." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "Default key").slice(0, 64);
  const created = await createApiKey({ userId: session.userId, name });
  await invalidate(CacheTags.agentKeys(session.userId), true);

  return NextResponse.json({
    ok: true,
    key: {
      id: created.id,
      name: created.name,
      keyPrefix: created.keyPrefix,
      scopes: created.scopes,
      createdAt: created.createdAt,
    },
    /** Shown once only */
    rawKey: created.rawKey,
  });
}

export async function DELETE(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.apiKey.updateMany({
    where: { id, userId: session.userId },
    data: { revokedAt: new Date() },
  });
  await invalidate(CacheTags.agentKeys(session.userId), true);

  return NextResponse.json({ ok: true });
}
