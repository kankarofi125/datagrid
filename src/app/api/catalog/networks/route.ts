import { prisma } from "@/lib/db";
import { cached, CacheKeys, CacheTags, CacheTTL } from "@/lib/cache";
import { publicCatalogJson } from "@/lib/http-cache";

export async function GET() {
  const data = await cached(
    CacheKeys.catalogNetworks(),
    async () => {
      const networks = await prisma.network.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      return {
        networks: networks.map((n) => ({
          code: n.code,
          name: n.name,
          color: n.color,
          status: n.status,
          uptimePct: Number(n.uptimePct),
          ussdBalance: n.ussdBalance,
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
