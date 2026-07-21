"use client";

import { cn } from "@/lib/cn";

const ORDER = ["PENDING", "PROCESSING", "DELIVERED", "FAILED", "REFUNDED"] as const;

export function StatusTrail({
  steps,
  activeStatus,
}: {
  steps?: { at: string; status: string; note?: string }[];
  activeStatus?: string;
}) {
  const current = (activeStatus || steps?.[steps.length - 1]?.status || "PENDING").toUpperCase();
  const display = ["PENDING", "PROCESSING", "DELIVERED"] as const;

  return (
    <div aria-live="polite" aria-atomic="false">
      <ol className="flex items-center justify-between gap-1">
        {display.map((s, i) => {
          const idx = ORDER.indexOf(current as (typeof ORDER)[number]);
          const sIdx = ORDER.indexOf(s);
          const done =
            current === "DELIVERED"
              ? true
              : current === "FAILED" || current === "REFUNDED"
                ? sIdx <= 1
                : sIdx <= idx;
          const active = s === current || (current === "REFUNDED" && s === "DELIVERED");
          return (
            <li key={s} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  done ? "bg-green" : "bg-ink/15",
                  active && current === "PROCESSING" && "bg-amber pulse-dot",
                  (current === "FAILED" || current === "REFUNDED") &&
                    i === 2 &&
                    "bg-danger"
                )}
              />
              <span className="font-mono-num text-[10px] tracking-wide text-ink/55">{s}</span>
            </li>
          );
        })}
      </ol>
      {steps && steps.length > 0 && (
        <ul className="mt-3 max-h-28 space-y-1 overflow-y-auto border-t border-line pt-2">
          {steps.map((s, i) => (
            <li key={i} className="font-mono-num text-[10px] text-ink/50">
              <span className="text-ink/80">{s.status}</span>
              {s.note ? ` · ${s.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
