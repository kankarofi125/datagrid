"use client";

import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
};

/**
 * Branded DataGrid dropdown.
 * 48px touch target, 16px value text (stops iOS auto-zoom on focus),
 * green-tinted chevron badge, same label/focus language as Input.
 */
export function Select({
  className,
  label,
  hint,
  error,
  mono,
  id,
  children,
  ...props
}: Props) {
  const selectId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="font-mono-num flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-ink/70 sm:text-[11px]"
        >
          <span className="inline-block h-3 w-0.5 rounded-full bg-green" aria-hidden />
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "h-12 w-full appearance-none rounded-xl border border-line bg-white py-3 pl-3.5 pr-12 text-base font-semibold text-ink shadow-[0_1px_0_rgba(14,33,26,.02)]",
            "outline-none ring-0 transition-[border-color,box-shadow]",
            "focus:border-green focus:outline-none focus:ring-2 focus:ring-green/12",
            "active:border-green",
            mono && "font-mono-num tracking-wide",
            error && "border-danger focus:border-danger focus:ring-danger/10",
            "disabled:opacity-50",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-green/10"
        >
          <svg
            className="h-3.5 w-3.5 text-green"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">{error}</p>
      ) : hint ? (
        <p className="font-mono-num text-[11px] text-ink/50">{hint}</p>
      ) : null}
    </div>
  );
}
