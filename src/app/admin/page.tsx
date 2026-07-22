"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatNaira } from "@/lib/money";
import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { cn } from "@/lib/cn";

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
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/gateways", label: "Gateways" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminCommandPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return <p className="text-xs text-ink/50">Loading command center…</p>;
  }

  const kpis = [
    { k: "GMV 30D", v: formatNaira(data.gmv, { compact: true }) },
    { k: "REVENUE", v: formatNaira(data.revenue, { compact: true }) },
    { k: "ORDERS", v: data.orders.toLocaleString("en-NG") },
    { k: "SUCCESS", v: `${data.successRate.toFixed(1)}%` },
    { k: "USERS", v: String(data.users) },
    { k: "FAILED", v: String(data.failed) },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <AdminPageHeader
        kicker="ERP · COMMAND"
        title="CONTROL ROOM."
        description="Live snapshot of DataGrid commerce, users, and rails."
      />

      {/* Mobile command */}
      <MobileOnly>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            {kpis.map((x) => (
              <div key={x.k} className="rounded-xl border border-line bg-paper px-2.5 py-2">
                <p className="font-mono-num text-[8px] text-ink/40">{x.k}</p>
                <p className="font-mono-num mt-0.5 text-sm font-semibold tabular-nums text-ink">
                  {x.v}
                </p>
              </div>
            ))}
          </div>

          <div>
            <p className="font-mono-num mb-1.5 text-[9px] tracking-wide text-ink/40">
              JUMP TO
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {QUICK.map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="rounded-xl border border-line bg-paper px-2 py-2.5 text-center text-[11px] font-semibold text-ink"
                >
                  {q.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-paper">
            <p className="font-mono-num border-b border-line px-2.5 py-1.5 text-[9px] text-ink/40">
              RECENT ORDERS
            </p>
            <ul>
              {data.recent.slice(0, 8).map((t, i) => (
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
                      {t.orderRef} · {t.status}
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

      {/* Desktop command */}
      <DesktopOnly>
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {kpis.map((x) => (
              <div key={x.k} className="surface p-4">
                <p className="font-mono-num text-[10px] text-ink/45">{x.k}</p>
                <p className="font-mono-num mt-1 text-2xl font-semibold tabular-nums">{x.v}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            <section className="xl:col-span-4">
              <h2 className="font-mono-num mb-2 text-[11px] tracking-widest text-ink/45">
                MODULES
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {QUICK.map((q) => (
                  <Link
                    key={q.href}
                    href={q.href}
                    className="surface surface-interactive block p-4 text-sm font-semibold"
                  >
                    {q.label}
                    <span className="mt-1 block font-mono-num text-[10px] font-normal text-ink/40">
                      OPEN →
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="xl:col-span-4">
              <h2 className="font-mono-num mb-2 text-[11px] tracking-widest text-ink/45">
                BY SERVICE
              </h2>
              <ul className="surface divide-y divide-line overflow-hidden">
                {Object.entries(data.byService).map(([k, v]) => (
                  <li key={k} className="flex justify-between px-4 py-3 text-sm">
                    <span className="font-medium">{k}</span>
                    <span className="font-mono-num">
                      {v.count} · {formatNaira(v.gmv, { compact: true })}
                    </span>
                  </li>
                ))}
                {Object.keys(data.byService).length === 0 && (
                  <li className="px-4 py-6 text-sm text-ink/50">No delivered orders yet</li>
                )}
              </ul>
            </section>

            <section className="xl:col-span-4">
              <h2 className="font-mono-num mb-2 text-[11px] tracking-widest text-ink/45">
                RAILS
              </h2>
              <ul className="space-y-2">
                {data.networks.map((n) => (
                  <li key={n.code} className="surface flex justify-between px-3 py-2 text-sm">
                    <span>{n.code}</span>
                    <span className="font-mono-num text-xs">
                      {n.status} · {n.uptimePct}%
                    </span>
                  </li>
                ))}
                {data.providers.map((p) => (
                  <li key={p.code} className="surface flex justify-between px-3 py-2 text-sm">
                    <span>
                      {p.code}{" "}
                      <span className="font-mono-num text-[10px] text-ink/40">{p.role}</span>
                    </span>
                    <span className="font-mono-num text-xs">
                      {p.isActive ? "ON" : "OFF"} · {p.successRate}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-mono-num text-[11px] tracking-widest text-ink/45">
                RECENT ORDERS
              </h2>
              <Link href="/admin/transactions" className="font-mono-num text-[10px] text-green">
                ALL TRANSACTIONS →
              </Link>
            </div>
            <div className="surface overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-ink/[0.03]">
                    {["REF", "SERVICE", "STATUS", "AMOUNT", "PHONE", "WHEN"].map((h) => (
                      <th
                        key={h}
                        className="font-mono-num px-3 py-2 text-[10px] tracking-wider text-ink/45"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((t) => (
                    <tr
                      key={t.orderRef}
                      className="border-b border-line last:border-0 hover:bg-ink/[0.02]"
                    >
                      <td className="font-mono-num px-3 py-2 text-green">{t.orderRef}</td>
                      <td className="px-3 py-2">{t.service}</td>
                      <td className="font-mono-num px-3 py-2 text-xs">{t.status}</td>
                      <td className="font-mono-num px-3 py-2">
                        {formatNaira(t.amount, { compact: true })}
                      </td>
                      <td className="font-mono-num px-3 py-2 text-xs">{t.phone}</td>
                      <td className="font-mono-num px-3 py-2 text-xs text-ink/50">
                        {new Date(t.createdAt).toLocaleString("en-NG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </DesktopOnly>
    </div>
  );
}
