"use client";

import { useState } from "react";
import Link from "next/link";
import { formatNaira } from "@/lib/money";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useLocalClock } from "@/hooks/useLocalClock";

export function DesktopTopBar({
  balance,
  phone,
  title,
}: {
  balance: number;
  phone: string;
  title?: string;
}) {
  const clock = useLocalClock();
  const [hidden, setHidden] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-4 px-8">
        <div className="flex items-center gap-6">
          <div className="font-mono-num text-[11px] tracking-wide text-ink/50">
            <span className="uppercase text-green">{clock.place || "LOCAL"}</span>{" "}
            {clock.time || "—"}
            {clock.zoneAbbr ? ` ${clock.zoneAbbr}` : ""}
          </div>
          {title && (
            <p className="font-mono-num hidden text-[11px] tracking-[0.14em] text-ink/35 xl:block">
              {title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <span className="font-mono-num hidden text-[11px] text-ink/45 sm:inline">
            {phone}
          </span>
          <div className="flex items-center gap-2 rounded-full border border-line bg-green-deep px-3 py-1.5 text-paper">
            <button
              type="button"
              aria-label={hidden ? "Show balance" : "Hide balance"}
              onClick={() => setHidden((h) => !h)}
              className="text-paper/70"
            >
              {hidden ? "○" : "◉"}
            </button>
            <span className="font-mono-num text-sm font-semibold tabular-nums">
              {hidden ? "₦••••" : formatNaira(balance)}
            </span>
          </div>
          <Link
            href="/wallet"
            className="rounded-md bg-green px-3 py-1.5 text-sm font-semibold text-white pressable"
          >
            Fund
          </Link>
        </div>
      </div>
    </header>
  );
}
