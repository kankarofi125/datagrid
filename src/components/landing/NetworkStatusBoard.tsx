"use client";

import { NETWORK_COLORS, type NetworkCode } from "@/lib/phone";
import { cn } from "@/lib/cn";

type Row = {
  code: NetworkCode;
  name: string;
  status: string;
  uptimePct: number;
};

const DEFAULT: Row[] = [
  { code: "MTN", name: "MTN", status: "OPERATIONAL", uptimePct: 99.7 },
  { code: "GLO", name: "Glo", status: "OPERATIONAL", uptimePct: 99.4 },
  { code: "AIRTEL", name: "Airtel", status: "OPERATIONAL", uptimePct: 99.6 },
  { code: "NINEMOBILE", name: "9mobile", status: "OPERATIONAL", uptimePct: 99.2 },
];

/** High-contrast status board for light marketing surfaces */
export function NetworkStatusBoard({
  networks = DEFAULT,
  className,
}: {
  networks?: Row[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border-2 border-green/30 bg-paper",
        "shadow-[0_10px_40px_rgba(4,41,28,0.12)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 bg-green-deep px-3 py-3 sm:px-4">
        <span className="font-mono-num text-[10px] uppercase tracking-[0.16em] text-paper sm:text-[11px]">
          Network status board
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/25 px-2 py-0.5 font-mono-num text-[10px] font-semibold text-amber">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-amber" />
          LIVE
        </span>
      </div>
      <ul className="divide-y divide-line bg-paper">
        {networks.map((n) => {
          const ok = n.status === "OPERATIONAL";
          const degraded = n.status === "DEGRADED";
          return (
            <li
              key={n.code}
              className="flex items-center justify-between gap-3 px-3 py-3.5 sm:px-4"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="pulse-dot h-3 w-3 shrink-0 rounded-full shadow-sm"
                  style={{
                    background: ok
                      ? NETWORK_COLORS[n.code]
                      : degraded
                        ? "#FFB703"
                        : "#E5484D",
                    boxShadow: `0 0 0 3px ${
                      ok
                        ? `${NETWORK_COLORS[n.code]}33`
                        : degraded
                          ? "#FFB70333"
                          : "#E5484D33"
                    }`,
                  }}
                />
                <span className="truncate text-sm font-semibold text-ink">{n.name}</span>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className={cn(
                    "font-mono-num text-[10px] font-semibold tracking-wide sm:text-[11px]",
                    ok ? "text-green" : degraded ? "text-[#B45309]" : "text-danger"
                  )}
                >
                  {n.status}
                </div>
                <div className="font-mono-num text-[10px] text-ink/55 sm:text-[11px]">
                  {Number(n.uptimePct).toFixed(1)}% uptime
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
