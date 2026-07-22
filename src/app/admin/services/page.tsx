"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatNaira } from "@/lib/money";
import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { cn } from "@/lib/cn";

type Catalog = {
  networks: { code: string; name: string; status: string; isActive: boolean; uptimePct: number }[];
  plans: {
    id: string;
    name: string;
    type: string;
    network: string;
    retailPrice: number;
    isActive: boolean;
  }[];
  billers: { id: string; code: string; name: string; category: string; isActive: boolean }[];
  providers: { code: string; name: string; role: string; isActive: boolean; successRate: number }[];
};

export default function AdminServicesPage() {
  const [data, setData] = useState<Catalog | null>(null);

  useEffect(() => {
    fetch("/api/admin/services")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <p className="text-xs text-ink/50">Loading services…</p>;

  return (
    <div className="space-y-4 lg:space-y-6">
      <AdminPageHeader
        kicker="COMMERCE"
        title="SERVICES."
        description="Networks, data plans, billers, and VTU rails — catalog control."
        actions={
          <Link
            href="/admin/rates"
            className="font-mono-num text-[10px] tracking-wide text-green"
          >
            EDIT RATES →
          </Link>
        }
      />

      <MobileOnly>
        <div className="space-y-3">
          <Section title="NETWORKS">
            {data.networks.map((n, i) => (
              <Row key={n.code} i={i} left={n.name} right={`${n.status} · ${n.uptimePct}%`} />
            ))}
          </Section>
          <Section title="PLANS">
            {data.plans.slice(0, 12).map((p, i) => (
              <Row
                key={p.id}
                i={i}
                left={`${p.network} ${p.name}`}
                right={formatNaira(p.retailPrice, { compact: true })}
              />
            ))}
          </Section>
          <Section title="BILLERS">
            {data.billers.slice(0, 12).map((b, i) => (
              <Row
                key={b.id}
                i={i}
                left={b.name}
                right={`${b.category}${b.isActive ? "" : " · OFF"}`}
              />
            ))}
          </Section>
        </div>
      </MobileOnly>

      <DesktopOnly>
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <Panel title="NETWORKS">
            <table className="w-full text-sm">
              <tbody>
                {data.networks.map((n) => (
                  <tr key={n.code} className="border-b border-line last:border-0">
                    <td className="py-2 font-medium">{n.name}</td>
                    <td className="font-mono-num py-2 text-right text-xs">
                      {n.status} · {n.uptimePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="DATA PLANS">
            <table className="w-full text-sm">
              <tbody>
                {data.plans.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="py-2">
                      <span className="font-medium">{p.name}</span>
                      <span className="font-mono-num ml-2 text-[10px] text-ink/40">
                        {p.network} · {p.type}
                      </span>
                    </td>
                    <td className="font-mono-num py-2 text-right">
                      {formatNaira(p.retailPrice, { compact: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="BILLERS">
            <table className="w-full text-sm">
              <tbody>
                {data.billers.map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="py-2 font-medium">{b.name}</td>
                    <td className="font-mono-num py-2 text-right text-xs text-ink/50">
                      {b.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="VTU PROVIDERS" className="xl:col-span-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {data.providers.map((p) => (
                <div key={p.code} className="rounded-lg border border-line px-3 py-3">
                  <p className="font-semibold">{p.name}</p>
                  <p className="font-mono-num mt-1 text-[11px] text-ink/50">
                    {p.role} · {p.isActive ? "ACTIVE" : "OFF"} · {p.successRate}%
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </DesktopOnly>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper">
      <p className="font-mono-num border-b border-line px-2.5 py-1.5 text-[9px] text-ink/40">
        {title}
      </p>
      <ul>{children}</ul>
    </div>
  );
}

function Row({ i, left, right }: { i: number; left: string; right: string }) {
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-2 px-2.5 py-2 text-[12px]",
        i > 0 && "border-t border-line"
      )}
    >
      <span className="min-w-0 truncate font-medium">{left}</span>
      <span className="font-mono-num shrink-0 text-[10px] text-ink/50">{right}</span>
    </li>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface p-4", className)}>
      <h2 className="font-mono-num mb-3 text-[11px] tracking-widest text-ink/45">{title}</h2>
      {children}
    </section>
  );
}
