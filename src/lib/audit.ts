import { prisma } from "@/lib/db";

export async function writeAudit(opts: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}) {
  return prisma.auditLog.create({
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
}
