"use client";

import { cn } from "@/lib/cn";

type Props = {
  steps: string[];
  activeIndex: number;
  className?: string;
};

/**
 * Compact progress for multi-step auth.
 * Mobile: circle + label stacked, connector line between.
 * Desktop: same, slightly roomier.
 */
export function AuthProgressRail({ steps, activeIndex, className }: Props) {
  return (
    <ol
      className={cn(
        "flex w-full items-start justify-between gap-0 rounded-2xl border border-line/80 bg-white px-2.5 py-3 sm:px-3 sm:py-3.5",
        className
      )}
      aria-label="Progress"
    >
      {steps.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li
            key={label}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            {/* Connector behind circles */}
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-[13px] h-[2px] rounded-full",
                  done ? "bg-green" : "bg-line"
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "font-mono-num relative z-[1] flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                done && "bg-green text-white",
                active &&
                  "bg-green text-white shadow-[0_0_0_4px_rgba(22,134,83,0.14)]",
                !done &&
                  !active &&
                  "border border-line bg-white text-ink/35"
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? (
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M3.5 8.2 6.6 11.2 12.5 4.8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            <span
              className={cn(
                "font-mono-num max-w-full truncate px-0.5 text-center text-[9px] tracking-[0.04em] sm:text-[10px]",
                active && "font-semibold text-ink",
                done && "text-green/80",
                !done && !active && "text-ink/35"
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
