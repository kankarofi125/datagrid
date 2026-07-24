import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { DashboardMobile } from "@/components/dashboard/DashboardMobile";
import { DashboardDesktop } from "@/components/dashboard/DashboardDesktop";
import type { NetworkCode } from "@/lib/phone";
import { cached, CacheKeys, CacheTags } from "@/lib/cache";

export default async function DashboardPage() {
  const session = await getSession();
  let name = "Operator";
  let balance = 0;
  let lastTx: {
    id: string;
    service: string;
    amount: number;
    phone: string | null;
    planId: string | null;
    orderRef?: string;
    status?: string;
  }[] = [];
  let networks: {
    code: NetworkCode;
    name: string;
    status: string;
    uptimePct: number;
  }[] = [];

  if (session.userId) {
    try {
      const userId = session.userId;
      const data = await cached(
        CacheKeys.dashboard(userId),
        async () => {
          const [user, rows, nets] = await Promise.all([
            prisma.user.findUnique({
              where: { id: userId },
              include: { wallets: true },
            }),
            prisma.transaction.findMany({
              where: {
                userId,
                service: { in: ["DATA", "AIRTIME"] },
                status: "DELIVERED",
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            }),
            prisma.network.findMany({
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
            }),
          ]);
          return {
            name: user?.name || user?.phoneLocal || "Operator",
            balance: Number(
              user?.wallets.find((wallet) => wallet.kind === "MAIN")?.balance ?? 0
            ),
            lastTx: rows.map((transaction) => ({
              id: transaction.id,
              service: transaction.service,
              amount: Number(transaction.amount),
              phone: transaction.phone,
              planId: transaction.planId,
              orderRef: transaction.orderRef,
              status: transaction.status,
            })),
            networks: nets.map((network) => ({
              code: network.code as NetworkCode,
              name: network.name,
              status: network.status,
              uptimePct: Number(network.uptimePct),
            })),
          };
        },
        {
          ttl: 20,
          staleTtl: 300,
          tags: [CacheTags.wallet(userId), CacheTags.catalog],
        }
      );
      name = data.name;
      balance = data.balance;
      lastTx = data.lastTx;
      networks = data.networks;
    } catch {
      /* ignore */
    }
  }

  const props = { name, balance, lastTx, networks };

  return (
    <>
      <MobileOnly>
        <DashboardMobile {...props} />
      </MobileOnly>
      <DesktopOnly>
        <DashboardDesktop {...props} />
      </DesktopOnly>
    </>
  );
}
