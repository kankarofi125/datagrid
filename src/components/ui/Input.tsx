"use client";

import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
};

/** Branded DataGrid text field */
export function Input({
  className,
  label,
  hint,
  error,
  mono,
  id,
  ...props
}: Props) {
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="font-mono-num flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink/70"
        >
          <span className="inline-block h-3 w-0.5 rounded-full bg-green" aria-hidden />
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "h-11 w-full rounded-lg border border-green/40 bg-paper px-3 text-base text-ink",
          "placeholder:text-ink/30",
          "outline-none ring-0",
          "focus:border-green focus:outline-none focus:ring-0",
          mono && "font-mono-num tracking-wide",
          error && "border-danger focus:border-danger",
          className
        )}
        {...props}
      />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="font-mono-num text-[11px] text-ink/50">{hint}</p>
      ) : null}
    </div>
  );
}
