import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { HistoryViews } from "@/components/history/HistoryViews";
import { cached, CacheKeys, CacheTags, CacheTTL } from "@/lib/cache";

export default async function HistoryPage() {
  const session = await getSession();
  let rows: {
    id: string;
    orderRef: string;
    service: string;
    status: string;
    amount: number;
    phone: string | null;
    createdAt: string;
  }[] = [];

  if (session.userId) {
    try {
      const userId = session.userId;
      rows = await cached(
        CacheKeys.history(userId),
        async () => {
          const data = await prisma.transaction.findMany({
            where: {
              OR: [
                { userId },
                { guestPhone: session.phone?.replace("+234", "0") },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          });
          return data.map((transaction) => ({
            id: transaction.id,
            orderRef: transaction.orderRef,
            service: transaction.service,
            status: transaction.status,
            amount: Number(transaction.amount),
            phone: transaction.phone,
            createdAt: transaction.createdAt.toISOString(),
          }));
        },
        {
          ttl: CacheTTL.user,
          staleTtl: 300,
          tags: [CacheTags.wallet(userId)],
        }
      );
    } catch {
      /* empty */
    }
  }

  return <HistoryViews rows={rows} />;
}
