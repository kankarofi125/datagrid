import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { cached, CacheKeys, CacheTags, CacheTTL } from "@/lib/cache";
import { privateJson } from "@/lib/http-cache";

export async function GET() {
  const { error } = await adminGate();
  if (error) return error;

  const data = await cached(
    CacheKeys.adminAudit(),
    async () => {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { actor: { select: { phoneLocal: true, name: true } } },
      });

      return {
        logs: logs.map((log) => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          actorPhone: log.actor?.phoneLocal,
          actorName: log.actor?.name,
          before: log.before ? safeJson(log.before) : null,
          after: log.after ? safeJson(log.after) : null,
          createdAt: log.createdAt,
        })),
      };
    },
    { ttl: CacheTTL.realtime, tags: [CacheTags.admin] }
  );

  return privateJson(data);
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
