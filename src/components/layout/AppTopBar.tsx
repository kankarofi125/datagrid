"use client";

import { NotificationBell } from "@/components/layout/NotificationBell";
import { MobileAppMenu } from "@/components/layout/MobileAppMenu";
import { useLocalClock } from "@/hooks/useLocalClock";
import { RealtimeDot } from "@/components/realtime/RealtimeProvider";

export function AppTopBar({ balance, phone }: { balance: number; phone: string }) {
  const clock = useLocalClock();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-green-deep text-paper lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <MobileAppMenu balance={balance} phone={phone} />
          <div className="min-w-0">
            <p className="font-mono-num flex items-center gap-1.5 truncate text-[10px] tracking-widest text-amber">
              <RealtimeDot />
              <span className="uppercase">{clock.place || "LOCAL"}</span>{" "}
              {clock.time || "—"}
              {clock.zoneAbbr ? ` ${clock.zoneAbbr}` : ""}
            </p>
            <p className="truncate text-[11px] text-paper/55">{phone || "DataGrid"}</p>
          </div>
        </div>
        <div className="[&_button]:border-white/15 [&_button]:bg-black/25 [&_button]:text-paper">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
