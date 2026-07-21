"use client";

import { NETWORK_COLORS, type NetworkCode } from "@/lib/phone";

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

export function NetworkStatusBoard({ networks = DEFAULT }: { networks?: Row[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono-num text-[10px] uppercase tracking-[0.16em] text-paper/60">
          Network status board
        </span>
        <span className="font-mono-num text-[10px] text-amber">LIVE</span>
      </div>
      <ul className="space-y-2">
        {networks.map((n) => (
          <li
            key={n.code}
            className="flex items-center justify-between gap-3 border-t border-white/5 pt-2 first:border-0 first:pt-0"
          >
            <div className="flex items-center gap-2">
              <span
                className="pulse-dot h-2 w-2 rounded-full"
                style={{
                  background:
                    n.status === "OPERATIONAL"
                      ? NETWORK_COLORS[n.code]
                      : n.status === "DEGRADED"
                        ? "#FFB703"
                        : "#E5484D",
                }}
              />
              <span className="text-sm font-medium text-paper">{n.name}</span>
            </div>
            <div className="font-mono-num text-right text-[11px] text-paper/70">
              <div>{n.status}</div>
              <div className="text-paper/45">{Number(n.uptimePct).toFixed(1)}% uptime</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
