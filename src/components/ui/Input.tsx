"use client";

import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
};

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
          className="font-mono-num text-[11px] uppercase tracking-[0.14em] text-ink/70"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "h-12 w-full rounded-md border border-line bg-paper px-3 text-base text-ink placeholder:text-ink/35",
          "focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20",
          mono && "font-mono-num",
          error && "border-danger",
          className
        )}
        {...props}
      />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink/55">{hint}</p>
      ) : null}
    </div>
  );
}
