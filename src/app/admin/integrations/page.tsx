"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";

type Row = {
  id: string;
  name: string;
  category: string;
  status: string;
  detail: string;
};

export default function AdminIntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/admin/integrations")
      .then((r) => r.json())
      .then((d) => setRows(d.integrations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <SkeletonPage variant="admin" />;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        kicker="INTEGRATIONS"
        title="SYSTEM RAILS."
        description="Database, messaging, payments, and VTU providers at a glance."
        actions={
          <Link href="/admin/providers" className="font-mono-num text-[10px] text-green">
            VTU PROVIDERS →
          </Link>
        }
      />

      <MobileOnly>
        <ul className="overflow-hidden rounded-xl border border-line bg-paper">
          {rows.map((r, i) => (
            <li
              key={r.id}
              className={cn("px-2.5 py-2.5", i > 0 && "border-t border-line")}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold">{r.name}</p>
                <StatusPill status={r.status} />
              </div>
              <p className="font-mono-num mt-0.5 text-[9px] text-ink/40">
                {r.category} · {r.detail}
              </p>
            </li>
          ))}
        </ul>
      </MobileOnly>

      <DesktopOnly>
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ink/[0.03]">
                {["NAME", "CATEGORY", "STATUS", "DETAIL"].map((h) => (
                  <th
                    key={h}
                    className="font-mono-num px-4 py-2 text-[10px] tracking-wider text-ink/45"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="font-mono-num px-4 py-3 text-xs text-ink/50">{r.category}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="font-mono-num px-4 py-3 text-xs text-ink/55">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </DesktopOnly>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const good = ["UP", "ACTIVE", "LIVE", "CONFIGURED"].includes(status);
  const warn = ["SIMULATE", "OFF"].includes(status);
  return (
    <span
      className={cn(
        "font-mono-num rounded-full px-2 py-0.5 text-[9px]",
        good && "bg-green/10 text-green",
        warn && "bg-amber/15 text-[#8A6D00]",
        !good && !warn && "bg-danger/10 text-danger"
      )}
    >
      {status}
    </span>
  );
}
