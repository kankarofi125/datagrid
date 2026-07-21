"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/money";
import { APP_NAV } from "@/components/layout/app-nav";

export function DesktopSidebar({
  balance,
  phone,
}: {
  balance: number;
  phone: string;
}) {
  const path = usePathname();

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-white/10 bg-green-deep text-paper">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-amber font-display text-sm text-ink">
            DG
          </span>
          <div>
            <p className="font-display text-lg tracking-wide">DATAGRID</p>
            <p className="font-mono-num text-[10px] tracking-widest text-paper/45">
              CONTROL ROOM
            </p>
          </div>
        </Link>
      </div>

      <div className="border-b border-white/10 px-5 py-4">
        <p className="font-mono-num text-[10px] tracking-widest text-amber">WALLET</p>
        <p className="font-mono-num mt-1 text-2xl font-semibold tabular-nums">
          {formatNaira(balance)}
        </p>
        <p className="mt-1 truncate text-xs text-paper/50">{phone}</p>
        <Link
          href="/wallet"
          className="mt-3 inline-flex font-mono-num text-[10px] tracking-wide text-amber hover:underline"
        >
          FUND →
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Desktop primary">
        <ul className="space-y-0.5">
          {APP_NAV.map((item) => {
            const active =
              path === item.href ||
              (item.href !== "/dashboard" && path.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-white/10 text-amber"
                      : "text-paper/70 hover:bg-white/5 hover:text-paper"
                  )}
                >
                  <span className="font-mono-num w-5 text-[10px] text-paper/35">
                    {item.mono}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-2 border-t border-white/10 px-5 py-4">
        <Link
          href="/admin"
          className="font-mono-num block text-[10px] tracking-wide text-amber/80 hover:text-amber"
        >
          ADMIN PANEL →
        </Link>
        <Link
          href="/"
          className="font-mono-num block text-[10px] tracking-wide text-paper/40 hover:text-paper/70"
        >
          ← MARKETING SITE
        </Link>
      </div>
    </aside>
  );
}
