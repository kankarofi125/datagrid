import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import type { TxStatus, TxService } from "@prisma/client";
import { cached, CacheKeys, CacheTags, CacheTTL } from "@/lib/cache";
import { privateJson } from "@/lib/http-cache";

export async function GET(req: Request) {
  const { error } = await adminGate();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status") || "";
  const service = searchParams.get("service") || "";
  const take = Math.min(100, Number(searchParams.get("take") || 40));
  const cacheQuery = new URLSearchParams({
    q: q.toLowerCase(),
    status,
    service,
    take: String(take),
  }).toString();

  const data = await cached(
    CacheKeys.adminTransactions(cacheQuery),
    async () => {
      const where: Record<string, unknown> = {};
      if (status) where.status = status as TxStatus;
      if (service) where.service = service as TxService;
      if (q) {
        where.OR = [
          { orderRef: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { guestPhone: { contains: q } },
        ];
      }

      const [rows, counts] = await Promise.all([
        prisma.transaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true,
            orderRef: true,
            service: true,
            status: true,
            amount: true,
            cost: true,
            phone: true,
            networkCode: true,
            providerId: true,
            provider: { select: { code: true } },
            createdAt: true,
            userId: true,
          },
        }),
        prisma.transaction.groupBy({
          by: ["status"],
          _count: true,
        }),
      ]);

      return {
        transactions: rows.map((transaction) => ({
          id: transaction.id,
          orderRef: transaction.orderRef,
          service: transaction.service,
          status: transaction.status,
          amount: Number(transaction.amount),
          cost: transaction.cost != null ? Number(transaction.cost) : null,
          phone: transaction.phone,
          networkCode: transaction.networkCode,
          providerCode: transaction.provider?.code || null,
          createdAt: transaction.createdAt.toISOString(),
          userId: transaction.userId,
        })),
        statusCounts: Object.fromEntries(
          counts.map((count) => [count.status, count._count])
        ),
      };
    },
    { ttl: CacheTTL.realtime, tags: [CacheTags.admin, CacheTags.analytics] }
  );

  return privateJson(data);
}
