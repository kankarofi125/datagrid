"use client";

import { cn } from "@/lib/cn";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function PinPad({
  value,
  onChange,
  maxLength = 4,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  disabled?: boolean;
}) {
  function press(k: string) {
    if (disabled) return;
    if (k === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (k === "") return;
    if (value.length >= maxLength) return;
    onChange(value + k);
  }

  return (
    <div>
      <div className="mb-3 flex justify-center gap-1.5" aria-label="PIN digits">
        {Array.from({ length: maxLength }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "font-mono-num text-base font-semibold",
              i < value.length ? "text-ink" : "text-ink/25"
            )}
          >
            {i < value.length ? "•" : "_"}
          </span>
        ))}
      </div>
      <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-2">
        {KEYS.map((k, i) => (
          <button
            key={`${k}-${i}`}
            type="button"
            disabled={disabled || k === ""}
            onClick={() => press(k)}
            className={cn(
              "pressable font-mono-num h-14 rounded-lg text-xl font-semibold",
              k === ""
                ? "invisible"
                : "border border-line bg-paper text-ink hover:bg-ink/5 active:bg-green/10"
            )}
            aria-label={k === "⌫" ? "Delete" : k}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
