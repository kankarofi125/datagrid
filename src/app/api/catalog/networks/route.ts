import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cached, CacheKeys, CacheTags } from "@/lib/cache";

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
    { ttl: 120, tags: [CacheTags.catalog] }
  );
  return NextResponse.json(data, {
    headers: { "X-Cache-Layer": "upstash" },
  });
}
