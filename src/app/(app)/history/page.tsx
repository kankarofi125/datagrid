import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { HistoryViews } from "@/components/history/HistoryViews";

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
      const data = await prisma.transaction.findMany({
        where: {
          OR: [
            { userId: session.userId },
            { guestPhone: session.phone?.replace("+234", "0") },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      rows = data.map((t) => ({
        id: t.id,
        orderRef: t.orderRef,
        service: t.service,
        status: t.status,
        amount: Number(t.amount),
        phone: t.phone,
        createdAt: t.createdAt.toISOString(),
      }));
    } catch {
      /* empty */
    }
  }

  return <HistoryViews rows={rows} />;
}
