import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { cached, CacheKeys, CacheTags, CacheTTL } from "@/lib/cache";
import { privateJson } from "@/lib/http-cache";

export async function GET() {
  const { error } = await adminGate();
  if (error) return error;

  const data = await cached(
    CacheKeys.adminProviders(),
    async () => {
      const [providers, logs] = await Promise.all([
        prisma.provider.findMany({ orderBy: { priority: "asc" } }),
        prisma.providerLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 40,
          include: { provider: true },
        }),
      ]);

      return {
        providers: providers.map((provider) => ({
          id: provider.id,
          code: provider.code,
          name: provider.name,
          role: provider.role,
          priority: provider.priority,
          isActive: provider.isActive,
          successRate: Number(provider.successRate),
          lastHealth: provider.lastHealth,
        })),
        logs: logs.map((log) => ({
          id: log.id,
          provider: log.provider.code,
          action: log.action,
          success: log.success,
          latencyMs: log.latencyMs,
          error: log.error,
          createdAt: log.createdAt,
        })),
      };
    },
    { ttl: CacheTTL.realtime, tags: [CacheTags.admin] }
  );

  return privateJson(data);
}

export async function PATCH(req: Request) {
  const { session, error } = await adminGate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const before = await prisma.provider.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    isActive?: boolean;
    priority?: number;
    role?: "PRIMARY" | "FALLBACK";
  } = {};
  if (body.isActive != null) data.isActive = Boolean(body.isActive);
  if (body.priority != null) data.priority = Number(body.priority);
  if (body.role === "PRIMARY" || body.role === "FALLBACK") data.role = body.role;

  const after = await prisma.provider.update({ where: { id }, data });
  await writeAudit({
    actorId: session!.userId,
    action: "PROVIDER_UPDATE",
    entityType: "Provider",
    entityId: id,
    before,
    after,
  });

  return NextResponse.json({ ok: true });
}

/** Simulate provider health check / failure log */
export async function POST(req: Request) {
  const { session, error } = await adminGate();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "health");

  if (action === "health") {
    const { runProviderHealthChecks } = await import("@/lib/provider-health");
    const result = await runProviderHealthChecks();
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "simulate_failure") {
    const provider = await prisma.provider.findUnique({ where: { code: "SIMULATOR" } });
    if (provider) {
      await prisma.providerLog.create({
        data: {
          providerId: provider.id,
          action: "simulate_failure",
          success: false,
          error: "Admin-triggered failure simulation",
          latencyMs: 12,
        },
      });
      await writeAudit({
        actorId: session!.userId,
        action: "PROVIDER_FAIL_SIM",
        entityType: "Provider",
        entityId: provider.id,
      });
    }
    return NextResponse.json({ ok: true, simulated: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
