"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  groupShellNav,
  isShellNavActive,
  type ShellNavItem,
} from "@/components/layout/shell-nav";

type FooterLink = {
  href: string;
  label: string;
  compactLabel: string;
  accent?: boolean;
  external?: boolean;
};

export function ShellSidebar({
  items,
  homeHref,
  brand,
  badge = "DG",
  subtitle,
  identity,
  ariaLabel,
  footerLinks = [],
  actionLabel,
  actionCompactLabel = "OUT",
  onAction,
}: {
  items: readonly ShellNavItem[];
  homeHref: string;
  brand: string;
  badge?: string;
  subtitle: string;
  identity?: string;
  ariaLabel: string;
  footerLinks?: FooterLink[];
  actionLabel?: string;
  actionCompactLabel?: string;
  onAction?: () => void | Promise<void>;
}) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const groups = useMemo(() => groupShellNav(items), [items]);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-white/8 bg-green-deep text-paper transition-[width] duration-300 ease-[cubic-bezier(.16,1,.3,1)]",
        collapsed ? "w-[76px]" : "w-[238px]"
      )}
    >
      <div
        className={cn(
          "flex pb-4 pt-5",
          collapsed
            ? "flex-col items-center gap-3 px-2"
            : "items-center justify-between gap-3 px-5"
        )}
      >
        <Link
          href={homeHref}
          className={cn("flex min-w-0 items-center gap-3", collapsed && "justify-center")}
          aria-label={collapsed ? `${brand} home` : undefined}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber font-display text-sm text-[#2c1b02] shadow-[0_10px_24px_-14px_rgba(242,166,61,.85)]">
            {badge}
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-display text-lg tracking-wide">{brand}</span>
              <span className="mt-0.5 block whitespace-nowrap font-mono-num text-[8px] tracking-[0.18em] text-paper/35">
                {subtitle}
              </span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.05] text-paper/52 transition hover:bg-white/10 hover:text-paper"
        >
          <CollapseIcon collapsed={collapsed} />
        </button>
      </div>

      {!collapsed && identity && (
        <p className="mx-5 mb-2 truncate border-t border-white/8 pt-3 text-[11px] text-paper/45">
          {identity}
        </p>
      )}

      <nav
        className={cn("flex-1 overflow-y-auto pb-4 pt-2", collapsed ? "px-2" : "px-3")}
        aria-label={ariaLabel}
      >
        {groups.map((group, groupIndex) => (
          <div
            key={group.label}
            className={cn(groupIndex > 0 && "mt-5 border-t border-white/8 pt-4")}
          >
            <p
              className={cn(
                "mb-1.5 px-3 font-mono-num text-[8px] font-semibold uppercase tracking-[0.18em] text-paper/28",
                collapsed && "sr-only"
              )}
            >
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isShellNavActive(path, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-9 items-center gap-3 rounded-xl px-3 text-[13px] transition",
                        collapsed && "justify-center px-2",
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
                          "w-5 font-mono-num text-[8px]",
                          collapsed && "w-auto text-[9px]",
                          active ? "text-amber" : "text-paper/22"
                        )}
                      >
                        {item.mono}
                      </span>
                      <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-white/8", collapsed ? "p-2" : "p-4")}>
        {onAction && actionLabel && (
          <button
            type="button"
            onClick={onAction}
            title={collapsed ? actionLabel : undefined}
            className={cn(
              "mb-2 flex min-h-10 w-full items-center rounded-xl bg-amber px-3 text-xs font-semibold text-[#2c1b02] transition hover:bg-[#eda030]",
              collapsed ? "justify-center px-1 font-mono-num text-[8px]" : "justify-between"
            )}
          >
            <span>{collapsed ? actionCompactLabel : actionLabel}</span>
            {!collapsed && <span aria-hidden>→</span>}
          </button>
        )}
        <div className={cn("grid gap-2", collapsed ? "grid-cols-1" : "grid-cols-2")}>
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
              className={cn(
                "flex min-h-9 items-center rounded-xl bg-white/[0.05] px-2.5 font-mono-num text-[8px] tracking-wide transition hover:bg-white/[0.09] hover:text-paper",
                collapsed ? "justify-center" : "justify-between",
                link.accent ? "text-amber/80" : "text-paper/45"
              )}
            >
              <span>{collapsed ? link.compactLabel : link.label}</span>
              {!collapsed && <span aria-hidden>↗</span>}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d={collapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
