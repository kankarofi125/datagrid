"use client";

import { cn } from "@/lib/cn";
import {
  LineChart as RLine,
  Line,
  AreaChart,
  Area,
  BarChart as RBar,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

type Point = { label: string; value: number };

const PALETTE = ["#008751", "#FFB703", "#04291C", "#E5484D", "#3DAE2B", "#0B231A", "#C9A227"];

function CustomTooltip({
  active,
  payload,
  label,
  valuePrefix = "",
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  valuePrefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-paper px-2.5 py-1.5 shadow-lg">
      <p className="font-mono-num text-[9px] text-ink/50">{label}</p>
      <p className="font-mono-num text-xs font-semibold text-ink">
        {valuePrefix}
        {payload[0].value.toLocaleString("en-NG")}
      </p>
    </div>
  );
}

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
  const data = series.map((p) => ({ name: p.label, value: p.value }));

  if (!data.length) {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <p className="text-xs text-ink/40">No data</p>
      </div>
    );
  }

  const last = series[series.length - 1];

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: "currentColor", opacity: 0.4 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: "currentColor", opacity: 0.4 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip valuePrefix={valuePrefix} />} />
          {fill ? (
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#fill-${color.replace("#", "")})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      {last && (
        <p className="font-mono-num mt-1 text-[10px] text-ink/45">
          Last: {valuePrefix}
          {last.value.toLocaleString("en-NG")}
        </p>
      )}
    </div>
  );
}

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
  const data = series.map((p) => ({ name: p.label, value: p.value }));

  if (!data.length) {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <p className="text-xs text-ink/40">No data</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RBar data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 8, fill: "currentColor", opacity: 0.4 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: "currentColor", opacity: 0.4 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="value"
            fill={color}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        </RBar>
      </ResponsiveContainer>
    </div>
  );
}

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
              className="h-full rounded-full transition-all"
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
  const data = series.map((p, i) => ({
    name: p.label,
    value: p.value,
    fill: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className={cn("flex flex-col items-center gap-3 sm:flex-row sm:items-center", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="rounded-lg border border-line bg-paper px-2.5 py-1.5 shadow-lg">
                    <p className="font-mono-num text-[9px] text-ink/50">{payload[0].name}</p>
                    <p className="font-mono-num text-xs font-semibold text-ink">
                      {payload[0].value?.toLocaleString("en-NG")}
                    </p>
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
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
        {data.map((s) => {
          const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
          return (
            <li key={s.name} className="flex items-center gap-2 text-[11px]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.fill }} />
              <span className="min-w-0 flex-1 truncate text-ink/70">{s.name}</span>
              <span className="font-mono-num text-ink/50">
                {Math.round((s.value / total) * 100)}%
              </span>
            </li>
          );
        })}
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

  const data = values.map((v, i) => ({ idx: i, value: v }));

  return (
    <div className={cn("h-5 w-16", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RLine data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </RLine>
      </ResponsiveContainer>
    </div>
  );
}
