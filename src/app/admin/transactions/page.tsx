"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { formatNaira } from "@/lib/money";
import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { cn } from "@/lib/cn";

type Tx = {
  id: string;
  orderRef: string;
  service: string;
  status: string;
  amount: number;
  phone: string | null;
  networkCode: string | null;
  providerCode: string | null;
  createdAt: string;
};

export default function AdminTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Tx[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");

  const load = useCallback((isInitial = false) => {
    if (isInitial) setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (service) params.set("service", service);
    fetch(`/api/admin/transactions?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.transactions || []);
        setStatusCounts(d.statusCounts || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q, status, service]);

  useEffect(() => {
    load(true);
  }, [load]);

  const filters = (
    <div className="flex flex-wrap gap-2">
      <Input
        label="Search"
        mono
        placeholder="Ref or phone"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="min-w-[140px]"
      />
      <div className="flex flex-col gap-1.5">
        <span className="font-mono-num text-[11px] uppercase tracking-[0.14em] text-ink/70">
          Status
        </span>
        <select
          className="h-11 rounded-lg border border-line bg-paper px-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All</option>
          {["PENDING", "PROCESSING", "DELIVERED", "FAILED", "REFUNDED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="font-mono-num text-[11px] uppercase tracking-[0.14em] text-ink/70">
          Service
        </span>
        <select
          className="h-11 rounded-lg border border-line bg-paper px-2 text-sm"
          value={service}
          onChange={(e) => setService(e.target.value)}
        >
          <option value="">All</option>
          {["DATA", "AIRTIME", "ELECTRICITY", "CABLE", "BETTING", "EXAM_PIN", "WALLET_FUND"].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            )
          )}
        </select>
      </div>
    </div>
  );

  if (loading) {
    return <SkeletonPage variant="list" />;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        kicker="COMMERCE"
        title="TRANSACTIONS."
        description="Search, filter, and audit every order on the grid."
      />

      <div className="flex flex-wrap gap-1.5">
        {Object.entries(statusCounts).map(([s, c]) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(status === s ? "" : s)}
            className={cn(
              "font-mono-num rounded-full border px-2.5 py-1 text-[10px]",
              status === s
                ? "border-green bg-green/10 text-green"
                : "border-line text-ink/50"
            )}
          >
            {s} {c}
          </button>
        ))}
      </div>

      {filters}

      <MobileOnly>
        <ul className="overflow-hidden rounded-xl border border-line bg-paper">
          {rows.map((t, i) => (
            <li
              key={t.id}
              className={cn(
                "flex items-center justify-between gap-2 px-2.5 py-2",
                i > 0 && "border-t border-line"
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold">
                  {t.service}{" "}
                  <span className="font-mono-num font-normal text-ink/40">{t.status}</span>
                </p>
                <p className="font-mono-num truncate text-[9px] text-ink/40">
                  {t.orderRef}
                  {t.phone ? ` · ${t.phone}` : ""}
                </p>
              </div>
              <p className="font-mono-num shrink-0 text-[12px] font-semibold text-green">
                {formatNaira(t.amount, { compact: true })}
              </p>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-3 py-8 text-center text-xs text-ink/50">No matches</li>
          )}
        </ul>
      </MobileOnly>

      <DesktopOnly>
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ink/[0.03]">
                {["REF", "SERVICE", "STATUS", "AMOUNT", "PHONE", "NET", "PROVIDER", "WHEN"].map(
                  (h) => (
                    <th
                      key={h}
                      className="font-mono-num px-3 py-2 text-[10px] tracking-wider text-ink/45"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0 hover:bg-ink/[0.02]">
                  <td className="font-mono-num px-3 py-2 text-green">{t.orderRef}</td>
                  <td className="px-3 py-2">{t.service}</td>
                  <td className="font-mono-num px-3 py-2 text-xs">{t.status}</td>
                  <td className="font-mono-num px-3 py-2 font-semibold">
                    {formatNaira(t.amount, { compact: true })}
                  </td>
                  <td className="font-mono-num px-3 py-2 text-xs">{t.phone || "—"}</td>
                  <td className="font-mono-num px-3 py-2 text-xs">{t.networkCode || "—"}</td>
                  <td className="font-mono-num px-3 py-2 text-xs">{t.providerCode || "—"}</td>
                  <td className="font-mono-num px-3 py-2 text-xs text-ink/50">
                    {new Date(t.createdAt).toLocaleString("en-NG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DesktopOnly>
    </div>
  );
}
