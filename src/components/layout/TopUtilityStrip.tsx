"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function formatWAT(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

export function TopUtilityStrip({
  status = "OPERATIONAL",
}: {
  status?: "OPERATIONAL" | "DEGRADED" | "DOWN";
}) {
  const [time, setTime] = useState("—:—:—");

  useEffect(() => {
    const tick = () => setTime(formatWAT(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const dot =
    status === "OPERATIONAL"
      ? "bg-green"
      : status === "DEGRADED"
        ? "bg-amber"
        : "bg-danger";

  return (
    <div className="border-b border-line bg-green-deep text-paper">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-[11px] sm:text-xs">
        <div className="font-mono-num flex items-center gap-3 tracking-wide">
          <span className="text-amber">LAGOS</span>
          <span aria-live="polite" aria-atomic="true">
            {time} WAT
          </span>
        </div>
        <div className="font-mono-num hidden items-center gap-2 tracking-[0.12em] sm:flex">
          <span className={`pulse-dot inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
          ALL NETWORKS · {status}
        </div>
        <Link
          href="/support"
          className="font-mono-num tracking-[0.1em] text-paper/80 transition hover:text-amber"
        >
          SUPPORT
        </Link>
      </div>
    </div>
  );
}
