"use client";

import { cn } from "@/lib/cn";

export type IdentifierMode = "phone" | "email";

type Props = {
  value: IdentifierMode;
  onChange: (mode: IdentifierMode) => void;
  disabled?: boolean;
  className?: string;
};

/** Phone | Email segmented control — large mobile tap targets. */
export function IdentifierToggle({
  value,
  onChange,
  disabled,
  className,
}: Props) {
  return (
    <div
      role="tablist"
      aria-label="Sign in with"
      className={cn(
        "grid grid-cols-2 gap-1 rounded-2xl border border-line bg-ink/[0.035] p-1",
        className
      )}
    >
      {(
        [
          { id: "phone" as const, label: "Phone", hint: "Nigerian line" },
          { id: "email" as const, label: "Email", hint: "Inbox login" },
        ] as const
      ).map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center rounded-[14px] px-2 py-2 transition-all",
              active
                ? "bg-white text-green shadow-[0_2px_8px_-2px_rgba(14,33,26,0.12)] ring-1 ring-black/[0.03]"
                : "text-ink/45 active:bg-white/50",
              disabled && "opacity-50"
            )}
          >
            <span className="font-mono-num text-[11px] font-semibold uppercase tracking-[0.12em]">
              {opt.label}
            </span>
            <span
              className={cn(
                "mt-0.5 text-[10px] leading-none",
                active ? "text-ink/40" : "text-ink/30"
              )}
            >
              {opt.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
