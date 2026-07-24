"use client";

import { NotificationBell } from "@/components/layout/NotificationBell";
import { MobileAppMenu } from "@/components/layout/MobileAppMenu";
import { useLocalClock } from "@/hooks/useLocalClock";
import { RealtimeDot } from "@/components/realtime/RealtimeProvider";

export function AppTopBar({ balance, phone }: { balance: number; phone: string }) {
  const clock = useLocalClock();

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-green-deep text-paper shadow-[0_12px_30px_-26px_rgba(10,46,34,.9)] lg:hidden">
      <div className="mx-auto flex min-h-[58px] max-w-lg items-center justify-between gap-3 px-3.5 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <MobileAppMenu balance={balance} phone={phone} />
          <div className="min-w-0">
            <p className="font-mono-num flex items-center gap-1.5 truncate text-[10px] font-semibold tracking-[0.12em] text-amber">
              <RealtimeDot />
              <span className="uppercase">{clock.place || "LOCAL"}</span>{" "}
              {clock.time || "—"}
              {clock.zoneAbbr ? ` ${clock.zoneAbbr}` : ""}
            </p>
            <p className="mt-1 truncate font-mono-num text-[10px] tracking-wide text-paper/50">
              {phone || "DataGrid"}
            </p>
          </div>
        </div>
        <div className="[&_button]:h-8.5 [&_button]:w-8.5 [&_button]:rounded-[11px] [&_button]:border-white/10 [&_button]:bg-white/[0.05] [&_button]:text-paper">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
