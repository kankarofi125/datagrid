import { prisma } from "@/lib/db";
import { cached, CacheKeys, CacheTags, CacheTTL } from "@/lib/cache";
import { publicCatalogJson } from "@/lib/http-cache";

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
          // resellerPrice omitted from public catalog (margin protection)
          networkCode: p.network.code,
          networkName: p.network.name,
          networkColor: p.network.color,
        })),
        cachedAt: new Date().toISOString(),
      };
    },
    { ttl: CacheTTL.catalog, tags: [CacheTags.catalog] }
  );

  return publicCatalogJson(data, {
    headers: { "X-Cache-Layer": "server" },
  });
}
