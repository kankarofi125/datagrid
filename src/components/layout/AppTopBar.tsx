"use client";

import { NotificationBell } from "@/components/layout/NotificationBell";
import { MobileAppMenu } from "@/components/layout/MobileAppMenu";
import { useLocalClock } from "@/hooks/useLocalClock";
import { RealtimeDot } from "@/components/realtime/RealtimeProvider";
import { FloatingMobileHeader } from "@/components/layout/ShellHeaders";

export function AppTopBar({ balance, phone }: { balance: number; phone: string }) {
  const clock = useLocalClock();

  return (
    <FloatingMobileHeader
      menu={<MobileAppMenu balance={balance} phone={phone} />}
      eyebrow={
        <span className="flex items-center gap-1.5">
          <RealtimeDot />
          <span className="uppercase">{clock.place || "LOCAL"}</span>{" "}
          {clock.time || "—"}
          {clock.zoneAbbr ? ` ${clock.zoneAbbr}` : ""}
        </span>
      }
      detail={phone || "DataGrid"}
      trailing={
        <div className="[&_button]:h-8.5 [&_button]:w-8.5 [&_button]:rounded-[11px] [&_button]:border-white/10 [&_button]:bg-white/[0.05] [&_button]:text-paper">
          <NotificationBell />
        </div>
      }
    />
  );
}
