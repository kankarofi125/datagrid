"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useLocalClock } from "@/hooks/useLocalClock";
import { APP_NAV } from "@/components/layout/app-nav";
import { BalanceAmount } from "@/components/ui/BalanceAmount";
import { FloatingDesktopHeader } from "@/components/layout/ShellHeaders";

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
  const path = usePathname();
  const [hidden, setHidden] = useState(false);
  const navItem = APP_NAV.find(
    (item) => path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href))
  );
  const onDashboard = path === "/dashboard";

  return (
    <FloatingDesktopHeader
      kicker={title || "Operator console"}
      title={navItem?.label || "DataGrid"}
      trailing={
        <>
          <div className="hidden items-center gap-2 font-mono-num text-[9px] tracking-wide text-ink/42 xl:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            <span className="uppercase text-green">{clock.place || "LOCAL"}</span>
            {clock.time || "—"}
            {clock.zoneAbbr ? ` ${clock.zoneAbbr}` : ""}
          </div>
          <span className="hidden font-mono-num text-[9px] text-ink/35 2xl:inline">
            {phone}
          </span>
          <NotificationBell />
          {!onDashboard && (
            <button
              type="button"
              aria-label={hidden ? "Show balance" : "Hide balance"}
              onClick={() => setHidden((value) => !value)}
              className="flex h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-ink shadow-sm"
            >
              <span className="text-green" aria-hidden>{hidden ? "○" : "◉"}</span>
              <BalanceAmount amount={balance} hidden={hidden} variant="compact" />
            </button>
          )}
          <Link
            href="/wallet"
            className="flex h-9 items-center gap-1.5 rounded-xl bg-green px-3.5 text-sm font-semibold text-white shadow-[0_8px_18px_-12px_rgba(22,134,83,.8)] pressable"
          >
            <span aria-hidden>+</span>
            Fund
          </Link>
        </>
      }
    />
  );
}
