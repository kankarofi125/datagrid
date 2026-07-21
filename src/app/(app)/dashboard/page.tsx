import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { DashboardMobile } from "@/components/dashboard/DashboardMobile";
import { DashboardDesktop } from "@/components/dashboard/DashboardDesktop";
import type { NetworkCode } from "@/lib/phone";

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
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: { wallets: true },
      });
      name = user?.name || user?.phoneLocal || name;
      balance = Number(user?.wallets.find((w) => w.kind === "MAIN")?.balance ?? 0);
      const rows = await prisma.transaction.findMany({
        where: {
          userId: session.userId,
          service: { in: ["DATA", "AIRTIME"] },
          status: "DELIVERED",
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      lastTx = rows.map((t) => ({
        id: t.id,
        service: t.service,
        amount: Number(t.amount),
        phone: t.phone,
        planId: t.planId,
        orderRef: t.orderRef,
        status: t.status,
      }));
      const nets = await prisma.network.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      networks = nets.map((n) => ({
        code: n.code as NetworkCode,
        name: n.name,
        status: n.status,
        uptimePct: Number(n.uptimePct),
      }));
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
