"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function FloatingMobileHeader({
  menu,
  eyebrow,
  detail,
  trailing,
  className,
}: {
  menu: ReactNode;
  eyebrow: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-2 z-30 mx-2 mt-2 rounded-[18px] border border-white/10 bg-green-deep/[0.98] text-paper shadow-[0_16px_38px_-22px_rgba(10,46,34,.82)] lg:hidden",
        className
      )}
    >
      <div className="mx-auto flex min-h-[56px] max-w-lg items-center justify-between gap-3 px-2.5 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          {menu}
          <div className="min-w-0">
            <div className="truncate font-mono-num text-[10px] font-semibold tracking-[0.12em] text-amber">
              {eyebrow}
            </div>
            {detail && (
              <div className="mt-1 truncate font-mono-num text-[10px] tracking-wide text-paper/50">
                {detail}
              </div>
            )}
          </div>
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    </header>
  );
}

export function FloatingDesktopHeader({
  kicker,
  title,
  leading,
  trailing,
  className,
}: {
  kicker: ReactNode;
  title: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-3 z-20 mx-5 mt-3 hidden rounded-2xl border border-white/75 bg-paper/88 shadow-[0_16px_42px_-28px_rgba(14,33,26,.38)] backdrop-blur-xl lg:block xl:mx-7",
        className
      )}
    >
      <div className="flex h-[58px] items-center justify-between gap-5 px-5 xl:px-7">
        <div className="flex min-w-0 items-center gap-3">
          {leading}
          <div className="min-w-0">
            <div className="font-mono-num text-[8px] font-semibold uppercase tracking-[0.18em] text-ink/32">
              {kicker}
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-ink/75">{title}</div>
          </div>
        </div>
        {trailing && <div className="flex shrink-0 items-center gap-3">{trailing}</div>}
      </div>
    </header>
  );
}

export function HeaderIconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-8.5 w-8.5 items-center justify-center rounded-[10px] border border-white/15 bg-black/25 text-paper transition active:scale-95",
        className
      )}
    >
      {children}
    </button>
  );
}
