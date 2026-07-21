"use client";

import Link from "next/link";
import { formatNaira } from "@/lib/money";
import { BuyDataFormBody } from "@/components/buy/BuyDataMobile";
import { Reveal } from "@/components/motion/Reveal";
import { MotionPageHeader } from "@/components/motion/PageChrome";
import type { BuyDataState } from "@/hooks/useBuyData";

export function BuyDataDesktop(s: BuyDataState) {
  return (
    <div className="px-8 py-8 xl:px-10">
      <MotionPageHeader
        kicker="VTU DESK · DATA"
        title="BUY DATA."
        description="Enter a line, pick a plan, confirm with PIN. Wallet debits before the provider fires — failures auto-refund."
        actions={
          s.balance != null ? (
            <Link href="/wallet" className="surface-deep surface-interactive px-6 py-5 text-paper">
              <p className="font-mono-num text-[10px] text-amber">AVAILABLE</p>
              <p className="font-mono-num mt-1 text-2xl font-semibold tabular-nums">
                {formatNaira(s.balance)}
              </p>
            </Link>
          ) : null
        }
      />

      <div className="grid items-start gap-8 xl:grid-cols-12">
        <Reveal delay={120} className="xl:col-span-8">
          <div className="surface space-y-5 p-6 xl:p-8">
            <BuyDataFormBody s={s} />
          </div>
        </Reveal>

        <Reveal delay={200} className="xl:col-span-4">
          <div className="surface sticky top-20 space-y-4 p-6">
            <p className="font-mono-num text-[10px] tracking-widest text-ink/45">
              ORDER PREVIEW
            </p>
            {s.selected ? (
              <div className="space-y-3">
                <p className="text-2xl font-semibold">{s.selected.name}</p>
                <p className="font-mono-num text-3xl text-green tabular-nums">
                  {formatNaira(s.selected.retailPrice)}
                </p>
                <p className="font-mono-num text-sm text-ink/55">
                  {s.selected.type} · {s.selected.validityDays} days ·{" "}
                  {s.selected.networkCode}
                </p>
                {s.local && (
                  <p className="font-mono-num text-sm">→ {s.local}</p>
                )}
                {s.balance != null && (
                  <p className="font-mono-num border-t border-line pt-3 text-xs text-ink/50">
                    After: {formatNaira(Math.max(0, s.balance - s.selected.retailPrice))}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink/50">Select a plan from the grid.</p>
            )}
            <div className="rounded-lg bg-green-deep/5 p-3 font-mono-num text-[10px] leading-relaxed tracking-wide text-ink/45">
              STATUS TRAIL ON CONFIRM
              <br />
              PENDING → PROCESSING → DELIVERED
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
