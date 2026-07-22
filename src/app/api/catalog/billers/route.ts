import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { BillerCategory } from "@prisma/client";
import { cached, CacheKeys, CacheTags } from "@/lib/cache";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category")?.toUpperCase() as
    | BillerCategory
    | undefined;

  const cacheKey = `${CacheKeys.catalogBillers()}:${category || "all"}`;

  const data = await cached(
    cacheKey,
    async () => {
      const billers = await prisma.biller.findMany({
        where: {
          isActive: true,
          ...(category ? { category } : {}),
        },
        include: {
          packages: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { name: "asc" },
      });

      return {
        billers: billers.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          category: b.category,
          validateType: b.validateType,
          packages: b.packages.map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            amount: Number(p.amount),
            resellerPrice:
              p.resellerPrice != null ? Number(p.resellerPrice) : null,
            validityDays: p.validityDays,
          })),
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
