"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { formatNaira } from "@/lib/money";

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
  const [pending, start] = useTransition();

  function load() {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []));
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

  return (
    <div className="space-y-6">
      <AdminPageHeader kicker="CATALOG" title="RATES." description="Bulk-friendly plan editor. Retail + reseller margin control." />
      {msg && <p className="text-sm text-green">{msg}</p>}

      <div className="overflow-x-auto surface">
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
                <td className="px-3 py-2 font-semibold">{p.networkCode}</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="font-mono-num px-3 py-2 text-xs">{p.type}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="font-mono-num w-24 rounded border border-line px-2 py-1"
                    defaultValue={p.retailPrice}
                    id={`r-${p.id}`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="font-mono-num w-24 rounded border border-line px-2 py-1"
                    defaultValue={p.resellerPrice}
                    id={`s-${p.id}`}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="font-mono-num text-xs"
                    onClick={() => update(p.id, { isActive: !p.isActive })}
                  >
                    {p.isActive ? "ON" : "OFF"}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      const retail = Number(
                        (document.getElementById(`r-${p.id}`) as HTMLInputElement)
                          ?.value
                      );
                      const reseller = Number(
                        (document.getElementById(`s-${p.id}`) as HTMLInputElement)
                          ?.value
                      );
                      update(p.id, { retailPrice: retail, resellerPrice: reseller });
                    }}
                  >
                    Save
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="font-mono-num text-xs text-ink/40">
        Live catalog: current retail example {plans[0] ? formatNaira(plans[0].retailPrice) : "—"}
      </p>
    </div>
  );
}
