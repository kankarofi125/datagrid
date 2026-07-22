import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cached, CacheKeys, CacheTags } from "@/lib/cache";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const network = searchParams.get("network");

  const data = await cached(
    CacheKeys.catalogPlans(network),
    async () => {
      const plans = await prisma.plan.findMany({
        where: {
          isActive: true,
          ...(network
            ? { network: { code: network.toUpperCase() } }
            : {}),
        },
        include: { network: true },
        orderBy: [{ sortOrder: "asc" }, { retailPrice: "asc" }],
      });

      return {
        plans: plans.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          sizeMb: p.sizeMb,
          validityDays: p.validityDays,
          retailPrice: Number(p.retailPrice),
          resellerPrice: Number(p.resellerPrice),
          networkCode: p.network.code,
          networkName: p.network.name,
          networkColor: p.network.color,
        })),
        cachedAt: new Date().toISOString(),
      };
    },
    { ttl: 120, tags: [CacheTags.catalog] }
  );

  return NextResponse.json(data, {
    headers: { "X-Cache-Layer": "upstash" },
  });
}
