"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/cn";
import { Select } from "@/components/ui/Select";

type PlanRow = {
  id: string;
  name: string;
  type: string;
  sizeMb: number;
  validityDays: number;
  retailPrice: number;
  networkCode: string;
  networkName: string;
  networkColor: string;
};

const NETWORKS = ["ALL", "MTN", "GLO", "AIRTEL", "NINEMOBILE"] as const;
const CATEGORIES = ["ALL", "SME", "CG", "SME2", "GIFTING"] as const;

const TYPE_STYLES: Record<string, string> = {
  SME: "bg-green/10 text-green",
  CG: "bg-amber/15 text-amber",
  SME2: "bg-green-deep/10 text-green-deep",
  GIFTING: "bg-ink/[0.06] text-ink/70",
};

export function RateBoard({ lockedNetwork }: { lockedNetwork?: string }) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  // lockedNetwork is static per page — initial state only, no sync effect.
  const [network, setNetwork] = useState<string>(lockedNetwork || "ALL");
  const [category, setCategory] = useState<string>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const filtered = useMemo(() => {
    let list = plans;
    if (network !== "ALL") list = list.filter((p) => p.networkCode === network);
    if (category !== "ALL") list = list.filter((p) => p.type === category);
    return list;
  }, [plans, network, category]);

  // Derived, never synced: falls back to the first option when the filter moves.
  const selected =
    filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-green-deep px-5 py-4">
        <h3 className="font-display text-xl text-paper">RATE BOARD</h3>
        <span className="font-mono-num text-[10px] tracking-widest text-amber">
          LIVE PRICING
        </span>
      </div>

      {!lockedNetwork && (
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
      )}

      <div className="flex gap-2 overflow-x-auto px-4 pt-3">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={cn(
              "font-mono-num shrink-0 rounded-full border px-3 py-1 text-[10px] tracking-wide transition",
              category === c
                ? "border-green-deep bg-green-deep text-white"
                : "border-line text-ink/60 hover:border-green/40"
            )}
          >
            {c === "ALL" ? "All types" : c}
          </button>
        ))}
      </div>

      <div className="space-y-3 p-4">
        <Select
          label="Plan"
          name="rate-plan"
          value={selected?.id ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={loading || filtered.length === 0}
          hint={
            loading
              ? "Loading live rates…"
              : `${filtered.length} plan${filtered.length === 1 ? "" : "s"}${
                  network !== "ALL" ? ` · ${network}` : ""
                }${category !== "ALL" ? ` · ${category}` : ""}`
          }
        >
          {!loading && (
            <option value="">
              {filtered.length ? "Select a plan…" : "No plans for this filter"}
            </option>
          )}
          {filtered.map((p) => (
            <option key={p.id} value={p.id}>
              {network === "ALL" ? `${p.networkName} · ` : ""}
              {p.name} · {p.validityDays}D · {formatNaira(p.retailPrice)}
            </option>
          ))}
        </Select>

        {selected && (
          <div
            className="edge-card flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-3"
            style={{
              borderLeftWidth: 4,
              borderLeftColor: selected.networkColor || undefined,
            }}
          >
            <div className="min-w-0">
              <p className="font-mono-num flex items-center gap-1.5 text-[11px] text-ink/50">
                <span
                  className={cn(
                    "rounded px-1.5 py-px text-[10px] font-semibold tracking-wide",
                    TYPE_STYLES[selected.type] || "bg-ink/[0.06] text-ink/70"
                  )}
                >
                  {selected.type}
                </span>
                {selected.validityDays} days validity
              </p>
              <p className="font-mono-num mt-1 text-2xl font-semibold text-green tabular-nums">
                {formatNaira(selected.retailPrice)}
              </p>
            </div>
            <Link
              href={`/services?service=data&planId=${selected.id}`}
              className="font-mono-num shrink-0 rounded-xl bg-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#007a49]"
            >
              Buy
            </Link>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="py-2 text-center text-sm text-ink/50">
            No plans for this filter. Try another network or type.
          </p>
        )}
      </div>
    </div>
  );
}
