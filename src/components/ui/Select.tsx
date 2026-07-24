"use client";

import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
};

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
          className="flex items-center gap-1.5 font-mono-num text-[10px] uppercase tracking-[0.14em] text-ink/70 sm:text-[11px]"
        >
          <span className="inline-block h-3 w-0.5 rounded-full bg-green" aria-hidden />
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "h-11 w-full appearance-none rounded-xl border border-line bg-white px-3 pr-9 text-[15px] text-ink shadow-[0_1px_0_rgba(14,33,26,.02)]",
          "bg-[linear-gradient(45deg,transparent_50%,rgba(14,33,26,.45)_50%),linear-gradient(135deg,rgba(14,33,26,.45)_50%,transparent_50%)] bg-[position:calc(100%-15px)_50%,calc(100%-10px)_50%] bg-[size:5px_5px,5px_5px] bg-no-repeat",
          "outline-none focus:border-green focus:ring-2 focus:ring-green/10",
          mono && "font-mono-num tracking-wide",
          error && "border-danger focus:border-danger",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="text-sm text-danger" role="alert">{error}</p>
      ) : hint ? (
        <p className="font-mono-num text-[11px] text-ink/50">{hint}</p>
      ) : null}
    </div>
  );
}
