"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { formatNaira } from "@/lib/money";
import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";

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
  const [queryInput, setQueryInput] = useState("");
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
    const frame = requestAnimationFrame(() => load(true));
    return () => cancelAnimationFrame(frame);
  }, [load]);

  const filters = (
    <div className="flex flex-wrap items-end gap-2">
      <SearchField
        value={queryInput}
        onChange={setQueryInput}
        onSearch={() => setQ(queryInput.trim())}
        placeholder="Ref or phone"
        className="min-w-[260px] flex-1"
      />
      <Select
        label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="min-w-36"
        mono
      >
          <option value="">All</option>
          {["PENDING", "PROCESSING", "DELIVERED", "FAILED", "REFUNDED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
      </Select>
      <Select
        label="Service"
        value={service}
        onChange={(e) => setService(e.target.value)}
        className="min-w-40"
        mono
      >
          <option value="">All</option>
          {["DATA", "AIRTIME", "ELECTRICITY", "CABLE", "EXAM_PIN", "WALLET_FUND"].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            )
          )}
      </Select>
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
          <Button
            key={s}
            onClick={() => setStatus(status === s ? "" : s)}
            variant={status === s ? "primary" : "ghost"}
            size="sm"
            className={cn(
              "h-7 rounded-full px-2.5 font-mono-num text-[10px]",
              status === s && "bg-green/10 text-green shadow-none hover:bg-green/15"
            )}
          >
            {s} {c}
          </Button>
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
        <Card className="overflow-x-auto">
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
        </Card>
      </DesktopOnly>
    </div>
  );
}
