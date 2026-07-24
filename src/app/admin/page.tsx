"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatNaira } from "@/lib/money";
import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { cn } from "@/lib/cn";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { useRealtimeRefresh } from "@/hooks/useRealtime";
import { BalanceAmount } from "@/components/ui/BalanceAmount";
import { ButtonLink } from "@/components/ui/Button";

type Analytics = {
  gmv: number;
  revenue: number;
  orders: number;
  failed: number;
  successRate: number;
  users: number;
  agents: number;
  byService: Record<string, { count: number; gmv: number }>;
  networks: { code: string; status: string; uptimePct: number }[];
  providers: { code: string; isActive: boolean; successRate: number; role: string }[];
  recent: {
    orderRef: string;
    service: string;
    status: string;
    amount: number;
    phone: string | null;
    createdAt: string;
  }[];
};

const QUICK = [
  { href: "/admin/analytics", label: "Analytics", mono: "CHARTS", tone: "deep" as const },
  { href: "/admin/transactions", label: "Transactions", mono: "LEDGER", tone: "paper" as const },
  { href: "/admin/users", label: "Users", mono: "PEOPLE", tone: "paper" as const },
  { href: "/admin/services", label: "Services", mono: "CATALOG", tone: "paper" as const },
  { href: "/admin/gateways", label: "Gateways", mono: "PAY", tone: "amber" as const },
  { href: "/admin/integrations", label: "Integrations", mono: "RAILS", tone: "paper" as const },
];

export default function AdminCommandPage() {
  const [data, setData] = useState<Analytics | null>(null);

  function load() {
    fetch("/api/admin/analytics?days=30")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  useRealtimeRefresh("admin:ops", load, ["tx:delivered", "invalidate"]);

  if (!data) {
    return <SkeletonPage variant="admin" />;
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <AdminPageHeader
        kicker="ERP · COMMAND"
        title="CONTROL ROOM."
        description="Jump board — open modules, glance KPIs, watch the latest orders."
        actions={
          <ButtonLink
            href="/admin/analytics"
            size="sm"
            className="font-mono-num text-[10px] tracking-wide"
          >
            FULL ANALYTICS →
          </ButtonLink>
        }
      />

      <MobileOnly>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl bg-green-deep text-paper">
            <div className="bg-grid grid grid-cols-2 gap-px p-0.5">
              {[
                ["GMV 30D", data.gmv],
                ["ORDERS", data.orders],
                ["SUCCESS", `${data.successRate.toFixed(1)}%`],
                ["USERS", data.users],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0 bg-green-deep/90 px-3 py-3">
                  <p className="font-mono-num text-[8px] tracking-wide text-amber/90">{k}</p>
                  {k === "GMV 30D" ? (
                    <BalanceAmount
                      amount={v}
                      compact
                      variant="card"
                      className="mt-1 text-paper"
                    />
                  ) : (
                    <p className="mt-1 truncate font-mono-num text-lg font-semibold tabular-nums">
                      {v}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {QUICK.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className={cn(
                  "rounded-xl border px-3 py-3",
                  q.tone === "deep" && "border-white/10 bg-green-deep text-paper",
                  q.tone === "amber" && "border-amber/30 bg-amber text-ink",
                  q.tone === "paper" && "border-line bg-paper text-ink"
                )}
              >
                <p
                  className={cn(
                    "font-mono-num text-[8px] tracking-wide",
                    q.tone === "deep" ? "text-amber" : "text-ink/40",
                    q.tone === "amber" && "text-ink/55"
                  )}
                >
                  {q.mono}
                </p>
                <p className="mt-1 text-[12px] font-semibold">{q.label}</p>
              </Link>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-paper">
            <div className="flex items-center justify-between border-b border-line bg-green-deep/5 px-2.5 py-1.5">
              <p className="font-mono-num text-[9px] text-ink/45">RECENT</p>
              <Link href="/admin/transactions" className="font-mono-num text-[9px] text-green">
                ALL →
              </Link>
            </div>
            <ul>
              {data.recent.slice(0, 6).map((t, i) => (
                <li
                  key={t.orderRef}
                  className={cn(
                    "flex items-center justify-between gap-2 px-2.5 py-2",
                    i > 0 && "border-t border-line"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold">{t.service}</p>
                    <p className="font-mono-num truncate text-[9px] text-ink/40">
                      {t.status}
                    </p>
                  </div>
                  <p className="font-mono-num shrink-0 text-[11px] font-semibold text-green">
                    {formatNaira(t.amount, { compact: true })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </MobileOnly>

      <DesktopOnly>
        <div className="space-y-6">
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="overflow-hidden rounded-2xl bg-green-deep text-paper lg:col-span-5">
              <div className="bg-grid p-6">
                <p className="font-mono-num text-[10px] tracking-widest text-amber">
                  30-DAY GMV
                </p>
                <BalanceAmount amount={data.gmv} className="mt-3 text-paper" />
                <p className="mt-2 text-sm text-paper/55">
                  Revenue est. {formatNaira(data.revenue, { compact: true })} ·{" "}
                  {data.successRate.toFixed(1)}% success
                </p>
                <Link
                  href="/admin/analytics"
                  className="mt-5 inline-flex font-mono-num text-[11px] tracking-wide text-amber hover:underline"
                >
                  OPEN ANALYTICS →
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:col-span-7 sm:grid-cols-3">
              {[
                ["ORDERS", data.orders.toLocaleString("en-NG"), "paper"],
                ["USERS", String(data.users), "paper"],
                ["AGENTS", String(data.agents), "amber"],
                ["FAILED", String(data.failed), "danger"],
                ["SUCCESS", `${data.successRate.toFixed(1)}%`, "paper"],
                ["REVENUE", formatNaira(data.revenue, { compact: true }), "deep"],
              ].map(([k, v, tone]) => (
                <div
                  key={k}
                  className={cn(
                    "min-w-0 overflow-hidden rounded-2xl border p-4",
                    tone === "paper" && "border-line bg-paper",
                    tone === "amber" && "border-amber/30 bg-amber/20",
                    tone === "danger" && "border-danger/20 bg-danger/5",
                    tone === "deep" && "border-white/10 bg-green-deep text-paper"
                  )}
                >
                  <p
                    className={cn(
                      "font-mono-num text-[10px] tracking-widest",
                      tone === "deep" ? "text-amber" : "text-ink/45"
                    )}
                  >
                    {k}
                  </p>
                  {k === "REVENUE" ? (
                    <BalanceAmount
                      amount={data.revenue}
                      compact
                      variant="compact"
                      className="mt-2 text-paper"
                    />
                  ) : (
                    <p
                      className={cn(
                        "mt-1 truncate font-mono-num text-xl font-semibold tabular-nums",
                        tone === "danger" && "text-danger"
                      )}
                    >
                      {v}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-mono-num mb-2 text-[11px] tracking-widest text-ink/45">
              MODULES
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {QUICK.map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className={cn(
                    "group rounded-2xl border p-5 transition hover:-translate-y-0.5",
                    q.tone === "deep" && "border-white/10 bg-green-deep text-paper",
                    q.tone === "amber" && "border-amber/40 bg-amber text-ink",
                    q.tone === "paper" && "border-line bg-paper hover:border-green/30"
                  )}
                >
                  <p
                    className={cn(
                      "font-mono-num text-[10px] tracking-widest",
                      q.tone === "deep" ? "text-amber" : "text-ink/40"
                    )}
                  >
                    {q.mono}
                  </p>
                  <p className="mt-2 text-lg font-semibold">{q.label}</p>
                  <p
                    className={cn(
                      "mt-3 font-mono-num text-[10px] tracking-wide opacity-60 transition group-hover:opacity-100",
                      q.tone === "deep" ? "text-paper" : "text-green"
                    )}
                  >
                    OPEN →
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-paper p-4">
              <h2 className="font-mono-num mb-3 text-[11px] tracking-widest text-ink/45">
                BY SERVICE
              </h2>
              <ul className="divide-y divide-line">
                {Object.entries(data.byService).map(([k, v]) => (
                  <li key={k} className="flex min-w-0 justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate font-medium">{k}</span>
                    <span className="shrink-0 font-mono-num text-xs text-ink/60">
                      {v.count} · {formatNaira(v.gmv, { compact: true })}
                    </span>
                  </li>
                ))}
                {Object.keys(data.byService).length === 0 && (
                  <li className="py-4 text-sm text-ink/50">No delivered orders yet</li>
                )}
              </ul>
            </section>
            <section className="rounded-2xl border border-line bg-paper p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-mono-num text-[11px] tracking-widest text-ink/45">
                  RECENT ORDERS
                </h2>
                <Link href="/admin/transactions" className="font-mono-num text-[10px] text-green">
                  ALL →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {data.recent.slice(0, 8).map((t) => (
                      <tr key={t.orderRef} className="border-b border-line last:border-0">
                        <td className="py-2 font-medium">{t.service}</td>
                        <td className="font-mono-num py-2 text-xs text-ink/50">{t.status}</td>
                        <td className="font-mono-num py-2 text-right font-semibold text-green">
                          {formatNaira(t.amount, { compact: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </DesktopOnly>
    </div>
  );
}
