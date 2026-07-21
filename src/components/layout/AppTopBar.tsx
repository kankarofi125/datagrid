"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatNaira } from "@/lib/money";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { MobileAppMenu } from "@/components/layout/MobileAppMenu";

export function AppTopBar({ balance, phone }: { balance: number; phone: string }) {
  const [hidden, setHidden] = useState(false);
  const [time, setTime] = useState("");

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
    <header className="sticky top-0 z-30 border-b border-line bg-green-deep text-paper lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <MobileAppMenu balance={balance} phone={phone} />
          <div className="min-w-0">
            <p className="font-mono-num text-[10px] tracking-widest text-amber">
              LAGOS {time} WAT
            </p>
            <p className="truncate text-xs text-paper/60">{phone || "DataGrid"}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="[&_button]:border-white/15 [&_button]:bg-black/25 [&_button]:text-paper">
            <NotificationBell />
          </div>
          <Link
            href="/wallet"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5"
          >
            <button
              type="button"
              aria-label={hidden ? "Show balance" : "Hide balance"}
              onClick={(e) => {
                e.preventDefault();
                setHidden((h) => !h);
              }}
              className="text-paper/70"
            >
              {hidden ? "○" : "◉"}
            </button>
            <span className="font-mono-num text-sm font-semibold tabular-nums">
              {hidden ? "₦••••" : formatNaira(balance)}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
