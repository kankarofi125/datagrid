"use client";

import Link from "next/link";
import { useLocalClock } from "@/hooks/useLocalClock";

export function TopUtilityStrip({
  status = "OPERATIONAL",
}: {
  status?: "OPERATIONAL" | "DEGRADED" | "DOWN";
}) {
  const clock = useLocalClock();

  const dot =
    status === "OPERATIONAL"
      ? "bg-green"
      : status === "DEGRADED"
        ? "bg-amber"
        : "bg-danger";

  return (
    <div className="border-b border-line bg-green-deep text-paper">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-[11px] sm:text-xs">
        <div className="font-mono-num flex min-w-0 items-center gap-2 tracking-wide sm:gap-3">
          <span className="truncate uppercase text-amber">{clock.place || "LOCAL"}</span>
          <span aria-live="polite" aria-atomic="true" className="shrink-0">
            {clock.time || "—"}
            {clock.zoneAbbr ? ` ${clock.zoneAbbr}` : ""}
          </span>
        </div>
        <div className="font-mono-num hidden items-center gap-2 tracking-[0.12em] sm:flex">
          <span className={`pulse-dot inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
          ALL NETWORKS · {status}
        </div>
        <Link
          href="/support"
          className="font-mono-num shrink-0 tracking-[0.1em] text-paper/80 transition hover:text-amber"
        >
          SUPPORT
        </Link>
      </div>
    </div>
  );
}
