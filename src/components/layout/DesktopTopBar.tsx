"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useLocalClock } from "@/hooks/useLocalClock";
import { APP_NAV } from "@/components/layout/app-nav";
import { BalanceAmount } from "@/components/ui/BalanceAmount";
import { BalanceEyeButton } from "@/components/ui/BalanceEyeToggle";
import { useBalanceHidden } from "@/hooks/useBalanceHidden";
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
  const { hidden } = useBalanceHidden();
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
            <span className="tabular-nums text-green" title="Nigeria time">
              {clock.time || "—"}
            </span>
          </div>
          <span className="hidden font-mono-num text-[9px] text-ink/35 2xl:inline">
            {phone}
          </span>
          <NotificationBell />
          {!onDashboard && (
            <div className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white pl-3 pr-1.5 text-ink shadow-sm">
              <BalanceAmount amount={balance} hidden={hidden} variant="compact" />
              <BalanceEyeButton className="h-8 w-8 border-0 bg-transparent text-ink/55 hover:bg-ink/[0.04] hover:text-ink" />
            </div>
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
