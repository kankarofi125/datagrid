"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/Sheet";
import {
  isShellNavActive,
  type ShellNavItem,
} from "@/components/layout/shell-nav";
import { HeaderIconButton } from "@/components/layout/ShellHeaders";

export function ShellMenuButton({
  label,
  expanded,
  onClick,
}: {
  label: string;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <HeaderIconButton label={label} onClick={onClick}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d={expanded ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </HeaderIconButton>
  );
}

export function ShellMobileMenuPanel({
  open,
  onClose,
  title,
  items,
  summary,
  footer,
  ariaLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: readonly ShellNavItem[];
  summary?: ReactNode;
  footer?: ReactNode;
  ariaLabel: string;
}) {
  const path = usePathname();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      className="max-h-[calc(100dvh-12px)]"
    >
      {summary && <div className="mb-3">{summary}</div>}
      <nav aria-label={ariaLabel}>
        <ul className="overflow-hidden rounded-xl border border-line bg-white">
          {items.map((item) => {
            const active = isShellNavActive(path, item);
            return (
              <li key={item.href} className="border-t border-line first:border-t-0">
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 items-center gap-3 px-3 py-2.5 text-[13px] transition",
                    active
                      ? "bg-green/10 font-semibold text-green"
                      : "text-ink hover:bg-ink/[0.03]"
                  )}
                >
                  <span className="w-6 font-mono-num text-[9px] text-ink/35">{item.mono}</span>
                  <span>{item.label}</span>
                  <span className="ml-auto font-mono-num text-[10px] text-ink/25">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {footer && (
        <div className="mt-3 border-t border-line pb-[env(safe-area-inset-bottom)] pt-3">
          {footer}
        </div>
      )}
    </Sheet>
  );
}
