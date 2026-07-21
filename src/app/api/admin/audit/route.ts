import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await adminGate();
  if (error) return error;

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { phoneLocal: true, name: true } } },
  });

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      actorPhone: l.actor?.phoneLocal,
      actorName: l.actor?.name,
      before: l.before ? safeJson(l.before) : null,
      after: l.after ? safeJson(l.after) : null,
      createdAt: l.createdAt,
    })),
  });
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
