"use client";

import { cn } from "@/lib/cn";

type Point = { label: string; value: number };

const PALETTE = ["#008751", "#FFB703", "#04291C", "#E5484D", "#3DAE2B", "#0B231A", "#C9A227"];

/** Smooth-ish polyline line chart */
export function LineChart({
  series,
  height = 160,
  color = "#008751",
  fill = true,
  className,
  valuePrefix = "",
}: {
  series: Point[];
  height?: number;
  color?: string;
  fill?: boolean;
  className?: string;
  valuePrefix?: string;
}) {
  const w = 400;
  const h = height;
  const pad = { t: 12, r: 8, b: 22, l: 8 };
  const values = series.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = 0;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const coords = series.map((p, i) => {
    const x = pad.l + (series.length <= 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    const y = pad.t + innerH - ((p.value - min) / (max - min || 1)) * innerH;
    return { x, y, ...p };
  });

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const area =
    coords.length > 0
      ? `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${(pad.t + innerH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(pad.t + innerH).toFixed(1)} Z`
      : "";

  const last = series[series.length - 1];

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Line chart">
        {/* grid */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={pad.l}
            x2={w - pad.r}
            y1={pad.t + innerH * (1 - f)}
            y2={pad.t + innerH * (1 - f)}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}
        {fill && area && (
          <path d={area} fill={color} fillOpacity={0.12} />
        )}
        {line && (
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={2.25}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {coords.length > 0 && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r={3.5}
            fill={color}
          />
        )}
        {/* sparse x labels */}
        {coords
          .filter((_, i) => i === 0 || i === coords.length - 1 || i % Math.ceil(coords.length / 5) === 0)
          .map((c) => (
            <text
              key={c.label + c.x}
              x={c.x}
              y={h - 6}
              textAnchor="middle"
              className="fill-current opacity-40"
              style={{ fontSize: 9, fontFamily: "var(--font-plex), monospace" }}
            >
              {c.label}
            </text>
          ))}
      </svg>
      {last && (
        <p className="font-mono-num mt-1 text-[10px] text-ink/45">
          Last: {valuePrefix}
          {last.value.toLocaleString("en-NG")}
        </p>
      )}
    </div>
  );
}

/** Vertical bar chart */
export function BarChart({
  series,
  height = 140,
  color = "#008751",
  className,
}: {
  series: Point[];
  height?: number;
  color?: string;
  className?: string;
}) {
  const max = Math.max(...series.map((p) => p.value), 1);
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <div className="flex h-full items-end gap-1 sm:gap-1.5">
        {series.map((p) => {
          const pct = (p.value / max) * 100;
          return (
            <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end justify-center">
                <div
                  className="w-full max-w-[28px] rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(pct, p.value > 0 ? 4 : 0)}%`,
                    background: `linear-gradient(180deg, ${color} 0%, ${color}99 100%)`,
                  }}
                  title={`${p.label}: ${p.value}`}
                />
              </div>
              <span className="font-mono-num max-w-full truncate text-[8px] text-ink/40">
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Horizontal bar breakdown */
export function HBarList({
  series,
  className,
  valueFormat,
}: {
  series: Point[];
  className?: string;
  valueFormat?: (n: number) => string;
}) {
  const max = Math.max(...series.map((p) => p.value), 1);
  const fmt = valueFormat || ((n: number) => n.toLocaleString("en-NG"));
  return (
    <ul className={cn("space-y-2.5", className)}>
      {series.map((p, i) => (
        <li key={p.label}>
          <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate font-medium text-ink">{p.label}</span>
            <span className="font-mono-num shrink-0 text-ink/55">{fmt(p.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(p.value / max) * 100}%`,
                backgroundColor: PALETTE[i % PALETTE.length],
              }}
            />
          </div>
        </li>
      ))}
      {series.length === 0 && (
        <li className="text-xs text-ink/45">No data in this window</li>
      )}
    </ul>
  );
}

/** Donut / ring chart */
export function DonutChart({
  series,
  size = 140,
  className,
  centerLabel,
  centerValue,
}: {
  series: Point[];
  size?: number;
  className?: string;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = series.reduce((s, p) => s + p.value, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const slices = series.map((p, i) => {
    const len = (p.value / total) * c;
    const slice = {
      ...p,
      color: PALETTE[i % PALETTE.length],
      dash: `${len} ${c - len}`,
      offset,
    };
    offset -= len;
    return slice;
  });

  return (
    <div className={cn("flex flex-col items-center gap-3 sm:flex-row sm:items-center", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(11,35,26,0.06)" strokeWidth="12" />
          {slices.map((s) => (
            <circle
              key={s.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="12"
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue && (
            <p className="font-mono-num text-sm font-semibold text-ink">{centerValue}</p>
          )}
          {centerLabel && (
            <p className="font-mono-num text-[8px] tracking-wide text-ink/40">{centerLabel}</p>
          )}
        </div>
      </div>
      <ul className="w-full space-y-1.5">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-ink/70">{s.label}</span>
            <span className="font-mono-num text-ink/50">
              {total ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({
  values,
  color = "#008751",
  className,
}: {
  values: number[];
  color?: string;
  className?: string;
}) {
  if (!values.length) return null;
  const w = 64;
  const h = 20;
  const max = Math.max(...values, 1);
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - (v / max) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-5 w-16", className)} aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}
