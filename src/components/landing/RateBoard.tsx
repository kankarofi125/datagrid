"use client";

import { useEffect, useMemo, useState } from "react";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/cn";

type PlanRow = {
  id: string;
  name: string;
  type: string;
  sizeMb: number;
  validityDays: number;
  retailPrice: number;
  networkCode: string;
  networkName: string;
};

const NETWORKS = ["ALL", "MTN", "GLO", "AIRTEL", "NINEMOBILE"] as const;

const TYPE_STYLES: Record<string, string> = {
  SME: "bg-green/10 text-green",
  CG: "bg-amber/15 text-amber",
  SME2: "bg-green-deep/10 text-green-deep",
  GIFTING: "bg-ink/[0.06] text-ink/70",
};

export function RateBoard() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [network, setNetwork] = useState<(typeof NETWORKS)[number]>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog/plans")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setPlans((d.plans || []) as PlanRow[]);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      network === "ALL"
        ? plans
        : plans.filter((p) => p.networkCode === network),
    [plans, network]
  );

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-green-deep px-5 py-4">
        <h3 className="font-display text-xl text-paper">RATE BOARD</h3>
        <span className="font-mono-num text-[10px] tracking-widest text-amber">
          LIVE PRICING
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto border-b border-line px-4 py-3">
        {NETWORKS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNetwork(n)}
            className={cn(
              "font-mono-num shrink-0 rounded border px-2 py-1 text-[10px] tracking-wide transition",
              network === n
                ? "border-green bg-green text-white"
                : "border-line text-ink/60 hover:border-green/40"
            )}
          >
            {n === "NINEMOBILE" ? "9MOBILE" : n}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-ink/[0.03]">
              {["NETWORK", "PLAN", "TYPE", "RETAIL"].map((h) => (
                <th
                  key={h}
                  className="font-mono-num px-4 py-2 text-[10px] tracking-[0.14em] text-ink/50"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-semibold">{p.networkName}</td>
                <td className="font-mono-num px-4 py-3">
                  {p.name}{" "}
                  <span className="text-ink/45">· {p.validityDays}D</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "font-mono-num rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
                      TYPE_STYLES[p.type] || "bg-ink/[0.06] text-ink/70"
                    )}
                  >
                    {p.type}
                  </span>
                </td>
                <td className="font-mono-num px-4 py-3 text-green">
                  {formatNaira(p.retailPrice, { compact: true })}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-ink/50"
                >
                  No plans for this network yet.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td
                  colSpan={4}
                  className="font-mono-num px-4 py-6 text-center text-xs tracking-wide text-ink/45"
                >
                  Loading live rates…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
