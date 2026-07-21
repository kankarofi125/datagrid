"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatNaira } from "@/lib/money";
import { NotificationBell } from "@/components/layout/NotificationBell";

export function DesktopTopBar({
  balance,
  phone,
  title,
}: {
  balance: number;
  phone: string;
  title?: string;
}) {
  const [time, setTime] = useState("");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const fmt = () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-4 px-8">
        <div className="flex items-center gap-6">
          <div className="font-mono-num text-[11px] tracking-wide text-ink/50">
            <span className="text-green">LAGOS</span> {time} WAT
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
