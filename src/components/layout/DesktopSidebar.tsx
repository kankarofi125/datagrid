"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { APP_NAV } from "@/components/layout/app-nav";

const GROUPS = [
  { label: "Overview", items: APP_NAV.slice(0, 1) },
  { label: "Buy services", items: APP_NAV.slice(1, 7) },
  { label: "Manage", items: APP_NAV.slice(7) },
];

export function DesktopSidebar() {
  const path = usePathname();

  return (
    <aside className="flex h-full w-[238px] shrink-0 flex-col border-r border-white/8 bg-green-deep text-paper">
      <div className="px-5 pb-4 pt-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber font-display text-sm text-[#2c1b02] shadow-[0_10px_24px_-14px_rgba(242,166,61,.85)]">
            DG
          </span>
          <div>
            <p className="font-display text-lg tracking-wide">DATAGRID</p>
            <p className="font-mono-num mt-0.5 text-[8px] tracking-[0.18em] text-paper/35">
              OPERATOR CONSOLE
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2" aria-label="Desktop primary">
        {GROUPS.map((group, groupIndex) => (
          <div
            key={group.label}
            className={cn(groupIndex > 0 && "mt-5 border-t border-white/8 pt-4")}
          >
            <p className="mb-1.5 px-3 font-mono-num text-[8px] font-semibold uppercase tracking-[0.18em] text-paper/28">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  path === item.href ||
                  (item.href !== "/dashboard" && path.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "relative flex min-h-9 items-center gap-3 rounded-xl px-3 text-[13px] transition",
                        active
                          ? "bg-white/[0.09] font-semibold text-paper"
                          : "text-paper/58 hover:bg-white/[0.045] hover:text-paper"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 h-4 w-0.5 rounded-r-full bg-amber" />
                      )}
                      <span
                        className={cn(
                          "font-mono-num w-5 text-[8px]",
                          active ? "text-amber" : "text-paper/22"
                        )}
                      >
                        {item.mono}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 p-4">
        <Link
          href="/support"
          className="flex min-h-10 items-center justify-between rounded-xl bg-white/[0.055] px-3 text-xs font-semibold text-paper/70 transition hover:bg-white/[0.09] hover:text-paper"
        >
          Help & support
          <span className="text-amber" aria-hidden>↗</span>
        </Link>
        <div className="mt-3 flex items-center justify-between px-1">
          <Link
            href="/admin"
            className="font-mono-num text-[8px] tracking-wider text-amber/70 hover:text-amber"
          >
            ADMIN
          </Link>
          <Link
            href="/"
            className="font-mono-num text-[8px] tracking-wider text-paper/28 hover:text-paper/60"
          >
            DATAGRID.NG ↗
          </Link>
        </div>
      </div>
    </aside>
  );
}
