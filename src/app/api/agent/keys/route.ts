import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createApiKey } from "@/lib/api-keys";
import { isAgentRole } from "@/lib/commissions";

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

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: JSON.parse(k.scopes) as string[],
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })),
  });
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

  return NextResponse.json({ ok: true });
}
