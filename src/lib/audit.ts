import { prisma } from "@/lib/db";
import { CacheTags, invalidate } from "@/lib/cache";

export async function writeAudit(opts: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}) {
  const entry = await prisma.auditLog.create({
    data: {
      actorId: opts.actorId || null,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId || null,
      before: opts.before != null ? JSON.stringify(opts.before) : null,
      after: opts.after != null ? JSON.stringify(opts.after) : null,
      ip: opts.ip || null,
    },
  });

  // Every audited admin mutation can affect at least one operational view.
  // Cache failure must never roll back a successful business mutation.
  await invalidate(CacheTags.admin, true).catch(() => {});
  return entry;
}
