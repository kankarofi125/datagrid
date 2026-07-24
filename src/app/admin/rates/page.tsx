"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { formatNaira } from "@/lib/money";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type Plan = {
  id: string;
  name: string;
  type: string;
  networkCode: string;
  retailPrice: number;
  resellerPrice: number;
  isActive: boolean;
};

export default function AdminRatesPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  function load() {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function update(id: string, patch: Partial<Plan>) {
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/admin/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        setMsg("Update failed");
        return;
      }
      setMsg("Saved");
      load();
    });
  }

  if (loading) {
    return <SkeletonPage variant="admin" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader kicker="CATALOG" title="RATES." description="Bulk-friendly plan editor. Retail + reseller margin control." />
      {msg && <p className="text-sm text-green">{msg}</p>}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-ink/[0.03]">
              {["NETWORK", "PLAN", "TYPE", "RETAIL", "RESELLER", "ACTIVE", ""].map((h) => (
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
            {plans.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-semibold">
                  <form
                    id={`plan-${p.id}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const data = new FormData(event.currentTarget);
                      update(p.id, {
                        retailPrice: Number(data.get("retail")),
                        resellerPrice: Number(data.get("reseller")),
                      });
                    }}
                  />
                  {p.networkCode}
                </td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="font-mono-num px-3 py-2 text-xs">{p.type}</td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    name="retail"
                    form={`plan-${p.id}`}
                    className="h-9 w-24 rounded-lg px-2 text-sm"
                    defaultValue={p.retailPrice}
                    mono
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    name="reseller"
                    form={`plan-${p.id}`}
                    className="h-9 w-24 rounded-lg px-2 text-sm"
                    defaultValue={p.resellerPrice}
                    mono
                  />
                </td>
                <td className="px-3 py-2">
                  <Button
                    size="sm"
                    variant={p.isActive ? "secondary" : "ghost"}
                    className="h-7 px-2 font-mono-num text-[10px]"
                    onClick={() => update(p.id, { isActive: !p.isActive })}
                  >
                    {p.isActive ? "ON" : "OFF"}
                  </Button>
                </td>
                <td className="px-3 py-2">
                  <Button
                    type="submit"
                    form={`plan-${p.id}`}
                    size="sm"
                    disabled={pending}
                  >
                    Save
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="font-mono-num text-xs text-ink/40">
        Live catalog: current retail example {plans[0] ? formatNaira(plans[0].retailPrice) : "—"}
      </p>
    </div>
  );
}
