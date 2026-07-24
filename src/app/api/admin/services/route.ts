import { NextResponse } from "next/server";
import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { cached, CacheKeys, CacheTags } from "@/lib/cache";

/** Catalog overview: networks, plans, billers */
export async function GET() {
  const { error } = await adminGate();
  if (error) return error;

  const data = await cached(
    CacheKeys.adminServices(),
    async () => {
      const [networks, plans, billers, providers] = await Promise.all([
        prisma.network.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.plan.findMany({
          include: { network: true },
          orderBy: { sortOrder: "asc" },
          take: 100,
        }),
        prisma.biller.findMany({
          where: { category: { not: "BETTING" } },
          orderBy: { name: "asc" },
          take: 80,
        }),
        prisma.provider.findMany({ orderBy: { priority: "asc" } }),
      ]);

      return {
        networks: networks.map((n) => ({
          id: n.id,
          code: n.code,
          name: n.name,
          status: n.status,
          isActive: n.isActive,
          uptimePct: Number(n.uptimePct),
        })),
        plans: plans.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          network: p.network.code,
          retailPrice: Number(p.retailPrice),
          resellerPrice: Number(p.resellerPrice),
          isActive: p.isActive,
          sizeMb: p.sizeMb,
        })),
        billers: billers.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          category: b.category,
          isActive: b.isActive,
        })),
        providers: providers.map((p) => ({
          code: p.code,
          name: p.name,
          role: p.role,
          isActive: p.isActive,
          successRate: Number(p.successRate),
        })),
        cachedAt: new Date().toISOString(),
      };
    },
    { ttl: 90, tags: [CacheTags.admin, CacheTags.catalog] }
  );

  return NextResponse.json(data, {
    headers: { "X-Cache-Layer": "upstash" },
  });
}
