import Link from "next/link";
import { redirect } from "next/navigation";
import { TxService, TxStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { cached, CacheKeys, CacheTags } from "@/lib/cache";
import { formatNaira } from "@/lib/money";
import { LineChart, DonutChart, HBarList } from "@/components/admin/charts";
import { MotionMobileHeader } from "@/components/motion/PageChrome";
import { PageHeader, MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { Reveal } from "@/components/motion/Reveal";

const PURCHASE_SERVICES: TxService[] = [
  TxService.DATA,
  TxService.AIRTIME,
  TxService.ELECTRICITY,
  TxService.CABLE,
  TxService.EXAM_PIN,
];
const TERMINAL_STATUSES = new Set<TxStatus>([
  TxStatus.DELIVERED,
  TxStatus.FAILED,
  TxStatus.REFUNDED,
  TxStatus.CANCELLED,
]);

const SERVICE_LABELS: Record<string, string> = {
  DATA: "Data",
  AIRTIME: "Airtime",
  ELECTRICITY: "Electricity",
  CABLE: "Cable TV",
  EXAM_PIN: "Exam pins",
};

type AnalyticsData = Awaited<ReturnType<typeof loadAnalytics>>;

async function loadAnalytics(userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { lifetimeVolume: true, createdAt: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        service: { in: PURCHASE_SERVICES },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "asc" },
      select: {
        service: true,
        status: true,
        amount: true,
        networkCode: true,
        createdAt: true,
      },
    }),
  ]);

  const delivered = transactions.filter((transaction) => transaction.status === TxStatus.DELIVERED);
  const deliveredSpend = delivered.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const terminal = transactions.filter((transaction) =>
    TERMINAL_STATUSES.has(transaction.status)
  );
  const successRate = terminal.length
    ? (delivered.length / terminal.length) * 100
    : 0;

  const dailyMap = new Map<string, number>();
  for (let offset = 0; offset < 30; offset += 1) {
    const day = new Date(since);
    day.setDate(since.getDate() + offset);
    dailyMap.set(day.toISOString().slice(0, 10), 0);
  }

  const serviceMap = new Map<string, number>();
  const networkMap = new Map<string, number>();
  const statusMap = new Map<string, number>();

  for (const transaction of transactions) {
    statusMap.set(transaction.status, (statusMap.get(transaction.status) || 0) + 1);
    if (transaction.status !== TxStatus.DELIVERED) continue;

    const amount = Number(transaction.amount);
    const day = transaction.createdAt.toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) || 0) + amount);
    serviceMap.set(transaction.service, (serviceMap.get(transaction.service) || 0) + amount);
    if (transaction.networkCode) {
      networkMap.set(
        transaction.networkCode,
        (networkMap.get(transaction.networkCode) || 0) + 1
      );
    }
  }

  const serviceSeries = [...serviceMap.entries()]
    .map(([service, value]) => ({ label: SERVICE_LABELS[service] || service, value }))
    .sort((a, b) => b.value - a.value);
  const dailySeries = [...dailyMap.entries()].map(([date, value]) => ({
    label: new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short" }).format(
      new Date(`${date}T12:00:00`)
    ),
    value,
  }));

  return {
    spend: deliveredSpend,
    orders: transactions.length,
    deliveredOrders: delivered.length,
    successRate,
    averageOrder: delivered.length ? deliveredSpend / delivered.length : 0,
    lifetimeVolume: Number(user?.lifetimeVolume || 0),
    memberSince: user?.createdAt.toISOString() || null,
    topService: serviceSeries[0]?.label || "No purchases yet",
    peakDay:
      [...dailyMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[1] > 0
        ? [...dailyMap.entries()].sort((a, b) => b[1] - a[1])[0]
        : null,
    dailySeries,
    serviceSeries,
    networkSeries: [...networkMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    statusSeries: [...statusMap.entries()].map(([label, value]) => ({
      label: label.charAt(0) + label.slice(1).toLowerCase(),
      value,
    })),
  };
}

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session.userId) redirect("/login");
  const userId = session.userId;
  const analytics = await cached(
    CacheKeys.userAnalytics(userId),
    () => loadAnalytics(userId),
    {
      ttl: 30,
      staleTtl: 600,
      tags: [CacheTags.wallet(userId)],
    }
  );

  return (
    <div className="px-3.5 pb-7 pt-4 lg:px-8 lg:py-8 xl:px-10">
      <MobileOnly>
          <MotionMobileHeader
            kicker="YOUR MONEY"
            title="ANALYTICS."
            trailing={
              <span className="rounded-full bg-green/8 px-2.5 py-1 font-mono-num text-[9px] font-semibold text-green">
                30 DAYS
              </span>
            }
          />
      </MobileOnly>
      <DesktopOnly>
          <PageHeader
            kicker="PERSONAL INSIGHTS · 30 DAYS"
            title="MY ANALYTICS."
            description="Understand where your money goes, how reliably orders deliver, and which services you use most."
            actions={
              <Link
                href="/services"
                className="flex min-h-11 items-center rounded-xl bg-green-deep px-5 text-sm font-semibold text-paper shadow-sm"
              >
                Buy a service
              </Link>
            }
          />
      </DesktopOnly>
      <AnalyticsContent data={analytics} />
    </div>
  );
}

function AnalyticsContent({ data }: { data: AnalyticsData }) {
  const peakLabel = data.peakDay
    ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short" }).format(
        new Date(`${data.peakDay[0]}T12:00:00`)
      )
    : "—";

  return (
    <div className="mt-4 space-y-3 lg:mt-0 lg:space-y-5">
      <Reveal delay={80}>
        <section className="overflow-hidden rounded-[20px] bg-green-deep p-4 text-paper lg:p-6">
          <p className="font-mono-num text-[9px] font-semibold uppercase tracking-[0.15em] text-amber">
            Delivered spend
          </p>
          <p className="font-mono-num mt-2 text-3xl font-semibold tracking-[-0.04em] tabular-nums lg:text-4xl">
            {formatNaira(data.spend)}
          </p>
          <div className="mt-4 grid grid-cols-3 border-t border-white/10 pt-3">
            <Insight label="Orders" value={String(data.deliveredOrders)} />
            <Insight label="Success" value={`${data.successRate.toFixed(1)}%`} bordered />
            <Insight label="Average" value={formatNaira(data.averageOrder, { compact: true })} />
          </div>
        </section>
      </Reveal>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
        <MetricCard label="Top service" value={data.topService} />
        <MetricCard label="Peak day" value={peakLabel} />
        <MetricCard
          label="Lifetime volume"
          value={formatNaira(data.lifetimeVolume, { compact: true })}
        />
        <MetricCard label="Attempts" value={data.orders.toLocaleString("en-NG")} />
      </div>

      {data.orders === 0 ? (
        <Reveal delay={160}>
          <section className="rounded-2xl border border-dashed border-green/25 bg-white p-5 text-center lg:p-8">
            <p className="text-base font-semibold">Your insights will appear here.</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink/50">
              Complete your first purchase and DataGrid will build a clear spending and
              reliability view automatically.
            </p>
            <Link
              href="/services"
              className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-green px-4 text-sm font-semibold text-white"
            >
              Explore services
            </Link>
          </section>
        </Reveal>
      ) : (
        <div className="grid gap-3 lg:grid-cols-12 lg:gap-5">
          <Reveal delay={160} className="lg:col-span-7">
            <section className="surface p-4 lg:p-5">
              <ChartHeading title="Daily spend" detail="Successful purchases · last 30 days" />
              <LineChart
                series={data.dailySeries}
                height={180}
                valuePrefix="₦"
              />
            </section>
          </Reveal>
          <Reveal delay={220} className="lg:col-span-5">
            <section className="surface p-4 lg:p-5">
              <ChartHeading title="Delivery status" detail="All purchase attempts" />
              <DonutChart
                series={data.statusSeries}
                size={140}
                centerLabel="Success"
                centerValue={`${data.successRate.toFixed(0)}%`}
              />
            </section>
          </Reveal>
          <Reveal delay={260} className="lg:col-span-7">
            <section className="surface p-4 lg:p-5">
              <ChartHeading title="Spend by service" detail="Where your wallet goes" />
              <HBarList
                series={data.serviceSeries}
                currency
              />
            </section>
          </Reveal>
          <Reveal delay={300} className="lg:col-span-5">
            <section className="surface p-4 lg:p-5">
              <ChartHeading title="Network mix" detail="Successful mobile orders" />
              <HBarList series={data.networkSeries} />
            </section>
          </Reveal>
        </div>
      )}
    </div>
  );
}

function Insight({
  label,
  value,
  bordered,
}: {
  label: string;
  value: string;
  bordered?: boolean;
}) {
  return (
    <div className={bordered ? "border-x border-white/10 px-3" : "px-1 first:pr-3 last:pl-3"}>
      <p className="font-mono-num text-[8px] uppercase tracking-wide text-paper/40">{label}</p>
      <p className="font-mono-num mt-1 text-xs font-semibold tabular-nums lg:text-sm">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface min-w-0 p-3.5 lg:p-5">
      <p className="font-mono-num text-[8px] uppercase tracking-[0.12em] text-ink/40">{label}</p>
      <p className="mt-1.5 truncate text-sm font-semibold text-ink lg:text-lg" title={value}>
        {value}
      </p>
    </div>
  );
}

function ChartHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-ink lg:text-base">{title}</h2>
      <p className="mt-0.5 font-mono-num text-[9px] uppercase tracking-wide text-ink/35">
        {detail}
      </p>
    </div>
  );
}
