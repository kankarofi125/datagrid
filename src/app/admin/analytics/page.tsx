"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  BarChart,
  DonutChart,
  HBarList,
  LineChart,
  Sparkline,
} from "@/components/admin/charts";
import { formatNaira } from "@/lib/money";
import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { cn } from "@/lib/cn";

type Daily = {
  date: string;
  label: string;
  gmv: number;
  orders: number;
  failed: number;
  revenue: number;
};

type Analytics = {
  windowDays: number;
  gmv: number;
  revenue: number;
  cost: number;
  orders: number;
  failed: number;
  successRate: number;
  users: number;
  agents: number;
  newUsers: number;
  gmvDeltaPct: number;
  byService: Record<string, { count: number; gmv: number }>;
  byNetwork: Record<string, { count: number; gmv: number }>;
  byStatus: Record<string, number>;
  daily: Daily[];
};

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/admin/analytics?days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [days]);

  const gmvSeries = useMemo(
    () => (data?.daily || []).map((d) => ({ label: d.label, value: d.gmv })),
    [data]
  );
  const orderSeries = useMemo(
    () => (data?.daily || []).map((d) => ({ label: d.label, value: d.orders })),
    [data]
  );
  const failSeries = useMemo(
    () => (data?.daily || []).map((d) => ({ label: d.label, value: d.failed })),
    [data]
  );
  const serviceBars = useMemo(
    () =>
      Object.entries(data?.byService || {})
        .map(([label, v]) => ({ label, value: v.gmv }))
        .sort((a, b) => b.value - a.value),
    [data]
  );
  const networkBars = useMemo(
    () =>
      Object.entries(data?.byNetwork || {})
        .map(([label, v]) => ({ label, value: v.count }))
        .sort((a, b) => b.value - a.value),
    [data]
  );
  const statusDonut = useMemo(
    () =>
      Object.entries(data?.byStatus || {}).map(([label, value]) => ({
        label,
        value,
      })),
    [data]
  );

  if (!data) {
    return (
      <div className="space-y-4">
        <AdminPageHeader kicker="INSIGHTS" title="ANALYTICS." />
        <p className="text-xs text-ink/50">Loading charts…</p>
      </div>
    );
  }

  const delta = data.gmvDeltaPct;
  const deltaLabel =
    delta === 0 ? "flat vs prior" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}% vs prior`;

  return (
    <div className="space-y-4 lg:space-y-6">
      <AdminPageHeader
        kicker="INSIGHTS"
        title="ANALYTICS."
        description={`${data.windowDays}-day performance — GMV, volume, mix, and reliability.`}
        actions={
          <div className="flex gap-1 rounded-lg border border-line bg-paper p-0.5">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  "font-mono-num rounded-md px-2.5 py-1.5 text-[10px]",
                  days === d ? "bg-green-deep text-paper" : "text-ink/50 hover:text-ink"
                )}
              >
                {d}D
              </button>
            ))}
          </div>
        }
      />

      {/* —— Mobile —— */}
      <MobileOnly>
        <div className="space-y-3">
          {/* Hero metric strip */}
          <div className="overflow-hidden rounded-2xl bg-green-deep p-4 text-paper">
            <div className="bg-grid -m-4 p-4">
              <p className="font-mono-num text-[9px] tracking-widest text-amber">GMV · {days}D</p>
              <p className="font-mono-num mt-1 text-2xl font-semibold tabular-nums">
                {formatNaira(data.gmv, { compact: true })}
              </p>
              <p className="font-mono-num mt-1 text-[10px] text-paper/50">{deltaLabel}</p>
              <div className="mt-3 opacity-90">
                <LineChart
                  series={gmvSeries}
                  height={100}
                  color="#FFB703"
                  valuePrefix="₦"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetricTile
              tone="paper"
              label="ORDERS"
              value={data.orders.toLocaleString("en-NG")}
              spark={orderSeries.map((p) => p.value)}
            />
            <MetricTile
              tone="amber"
              label="REVENUE"
              value={formatNaira(data.revenue, { compact: true })}
              spark={data.daily.map((d) => d.revenue)}
            />
            <MetricTile
              tone="paper"
              label="SUCCESS"
              value={`${data.successRate.toFixed(1)}%`}
            />
            <MetricTile tone="danger" label="FAILED" value={String(data.failed)} />
          </div>

          <ChartCard title="DAILY ORDERS" subtitle="Delivered volume">
            <BarChart series={orderSeries} height={120} color="#008751" />
          </ChartCard>

          <ChartCard title="SERVICE MIX" subtitle="GMV by product">
            <HBarList
              series={serviceBars}
              valueFormat={(n) => formatNaira(n, { compact: true })}
            />
          </ChartCard>

          <ChartCard title="STATUS SPLIT">
            <DonutChart
              series={statusDonut}
              size={120}
              centerLabel="TX"
              centerValue={String(
                Object.values(data.byStatus).reduce((a, b) => a + b, 0)
              )}
            />
          </ChartCard>

          <ChartCard title="FAILURES" subtitle="Failed / refunded per day">
            <LineChart series={failSeries} height={100} color="#E5484D" fill />
          </ChartCard>
        </div>
      </MobileOnly>

      {/* —— Desktop —— */}
      <DesktopOnly>
        <div className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="overflow-hidden rounded-2xl bg-green-deep p-5 text-paper lg:col-span-2">
              <div className="bg-grid -m-5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono-num text-[10px] tracking-widest text-amber">
                      GROSS MERCHANDISE VALUE
                    </p>
                    <p className="font-mono-num mt-2 text-4xl font-semibold tabular-nums">
                      {formatNaira(data.gmv)}
                    </p>
                    <p className="font-mono-num mt-2 text-xs text-paper/50">{deltaLabel}</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                    <p className="font-mono-num text-[10px] text-amber">{days}D</p>
                  </div>
                </div>
                <div className="mt-4 text-paper">
                  <LineChart series={gmvSeries} height={140} color="#FFB703" />
                </div>
              </div>
            </div>

            <MetricPanel
              label="REVENUE EST."
              value={formatNaira(data.revenue, { compact: true })}
              hint={`Cost ${formatNaira(data.cost, { compact: true })}`}
              tone="deep"
            />
            <MetricPanel
              label="SUCCESS RATE"
              value={`${data.successRate.toFixed(1)}%`}
              hint={`${data.failed} failed / refunded`}
              tone="paper"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricPanel
              label="DELIVERED ORDERS"
              value={data.orders.toLocaleString("en-NG")}
              hint="In window"
              tone="paper"
              spark={orderSeries.map((p) => p.value)}
            />
            <MetricPanel
              label="ACTIVE USERS"
              value={String(data.users)}
              hint={`${data.newUsers} new · ${data.agents} agents`}
              tone="paper"
            />
            <MetricPanel
              label="AVG ORDER"
              value={
                data.orders
                  ? formatNaira(data.gmv / data.orders, { compact: true })
                  : "—"
              }
              hint="Delivered only"
              tone="amber"
            />
            <MetricPanel
              label="FAILED"
              value={String(data.failed)}
              hint="Includes refunds"
              tone="danger"
              spark={failSeries.map((p) => p.value)}
              sparkColor="#E5484D"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
            <ChartCard
              className="xl:col-span-7"
              title="DAILY ORDER VOLUME"
              subtitle="Delivered transactions per day"
            >
              <BarChart series={orderSeries} height={180} color="#008751" />
            </ChartCard>
            <ChartCard
              className="xl:col-span-5"
              title="ORDER STATUS"
              subtitle="All statuses in window"
            >
              <DonutChart
                series={statusDonut}
                size={150}
                centerLabel="TOTAL"
                centerValue={String(
                  Object.values(data.byStatus).reduce((a, b) => a + b, 0)
                )}
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="GMV BY SERVICE" subtitle="Product mix">
              <HBarList
                series={serviceBars}
                valueFormat={(n) => formatNaira(n, { compact: true })}
              />
            </ChartCard>
            <ChartCard title="VOLUME BY NETWORK" subtitle="Delivered count">
              <HBarList series={networkBars} />
            </ChartCard>
          </div>

          <ChartCard title="FAILURE TREND" subtitle="Failed & refunded per day">
            <LineChart series={failSeries} height={120} color="#E5484D" />
          </ChartCard>
        </div>
      </DesktopOnly>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-paper p-3 shadow-[0_8px_28px_-18px_rgba(11,35,26,0.25)] sm:p-4",
        className
      )}
    >
      <div className="mb-3">
        <p className="font-mono-num text-[9px] tracking-[0.14em] text-ink/40">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-ink/50">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function MetricTile({
  label,
  value,
  tone,
  spark,
}: {
  label: string;
  value: string;
  tone: "paper" | "amber" | "danger";
  spark?: number[];
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-2.5 py-2.5",
        tone === "paper" && "border-line bg-paper",
        tone === "amber" && "border-amber/30 bg-amber/15",
        tone === "danger" && "border-danger/20 bg-danger/5"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-mono-num text-[8px] tracking-wide text-ink/45">{label}</p>
        {spark && spark.some((v) => v > 0) && (
          <Sparkline values={spark} color={tone === "danger" ? "#E5484D" : "#008751"} />
        )}
      </div>
      <p className="font-mono-num mt-1 text-base font-semibold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}

function MetricPanel({
  label,
  value,
  hint,
  tone,
  spark,
  sparkColor,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "paper" | "deep" | "amber" | "danger";
  spark?: number[];
  sparkColor?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "paper" && "border-line bg-paper",
        tone === "deep" && "border-white/10 bg-green-deep text-paper",
        tone === "amber" && "border-amber/25 bg-amber text-ink",
        tone === "danger" && "border-danger/20 bg-paper"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "font-mono-num text-[10px] tracking-widest",
            tone === "deep" ? "text-amber" : "text-ink/45",
            tone === "amber" && "text-ink/60"
          )}
        >
          {label}
        </p>
        {spark && spark.some((v) => v > 0) && (
          <Sparkline
            values={spark}
            color={
              sparkColor ||
              (tone === "deep" ? "#FFB703" : tone === "danger" ? "#E5484D" : "#008751")
            }
          />
        )}
      </div>
      <p
        className={cn(
          "font-mono-num mt-2 text-2xl font-semibold tabular-nums",
          tone === "danger" && "text-danger"
        )}
      >
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            "mt-1 text-xs",
            tone === "deep" ? "text-paper/50" : "text-ink/45"
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
