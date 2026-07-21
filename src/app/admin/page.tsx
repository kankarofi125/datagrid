"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { useEffect, useState } from "react";
import { formatNaira } from "@/lib/money";

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

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return <p className="text-sm text-ink/50">Loading analytics…</p>;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader kicker="30-DAY WINDOW" title="ANALYTICS." />

      <Reveal delay={100}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["GMV", formatNaira(data.gmv, { compact: true })],
            ["REVENUE EST.", formatNaira(data.revenue, { compact: true })],
            ["ORDERS", data.orders.toLocaleString("en-NG")],
            ["SUCCESS", `${data.successRate.toFixed(1)}%`],
          ].map(([k, v]) => (
            <div key={k} className="surface surface-interactive p-4">
              <p className="font-mono-num text-[10px] text-ink/45">{k}</p>
              <p className="font-mono-num mt-1 text-2xl font-semibold text-ink tabular-nums">
                {v}
              </p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={160}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="surface p-4">
            <p className="font-mono-num text-[10px] text-ink/45">USERS</p>
            <p className="font-mono-num text-xl font-semibold tabular-nums">{data.users}</p>
          </div>
          <div className="surface p-4">
            <p className="font-mono-num text-[10px] text-amber">AGENTS</p>
            <p className="font-mono-num text-xl font-semibold tabular-nums">{data.agents}</p>
          </div>
          <div className="surface p-4">
            <p className="font-mono-num text-[10px] text-danger">FAILED / REFUNDED</p>
            <p className="font-mono-num text-xl font-semibold tabular-nums">{data.failed}</p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={220}>
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
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

          <section>
            <h2 className="font-mono-num mb-2 text-[11px] tracking-widest text-ink/45">
              NETWORK / PROVIDER
            </h2>
            <ul className="space-y-2">
              {data.networks.map((n) => (
                <li
                  key={n.code}
                  className="surface flex justify-between px-3 py-2 text-sm"
                >
                  <span>{n.code}</span>
                  <span className="font-mono-num text-xs">
                    {n.status} · {n.uptimePct}%
                  </span>
                </li>
              ))}
              {data.providers.map((p) => (
                <li
                  key={p.code}
                  className="surface flex justify-between px-3 py-2 text-sm"
                >
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
      </Reveal>

      <Reveal delay={280}>
        <section>
          <h2 className="font-mono-num mb-2 text-[11px] tracking-widest text-ink/45">
            RECENT ORDERS
          </h2>
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
                    className="border-b border-line transition last:border-0 hover:bg-ink/[0.02]"
                  >
                    <td className="font-mono-num px-3 py-2 text-green">{t.orderRef}</td>
                    <td className="px-3 py-2">{t.service}</td>
                    <td className="font-mono-num px-3 py-2 text-xs">{t.status}</td>
                    <td className="font-mono-num px-3 py-2">
                      {formatNaira(t.amount, { compact: true })}
                    </td>
                    <td className="font-mono-num px-3 py-2">{t.phone}</td>
                    <td className="font-mono-num px-3 py-2 text-xs text-ink/50">
                      {new Date(t.createdAt).toLocaleString("en-NG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
