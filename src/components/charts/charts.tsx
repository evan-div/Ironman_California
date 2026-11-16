"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type Series = { key: string; label: string; color: string; outlined?: boolean };
export type Datum = { label: string; fullLabel?: string } & Record<string, string | number | null | undefined>;

const AXIS = { fontSize: 11, fill: "#5f6a61" } as const;
const GRID = "#eceee6";

function useReducedMotion() {
  return React.useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

function formatValue(value: number, unit: string, digits: number) {
  const n = value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  return unit === "%" ? `${n}%` : `${n} ${unit}`;
}

type TooltipEntry = { dataKey?: string | number; value?: number | string | null; payload?: Datum };

function ChartTooltip({
  active,
  payload,
  series,
  unit,
  digits,
  showTotal,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  series: Series[];
  unit: string;
  digits: number;
  showTotal?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  const rows = series
    .map((s) => ({ s, value: payload.find((p) => p.dataKey === s.key)?.value }))
    .filter((r) => typeof r.value === "number") as { s: Series; value: number }[];
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-medium text-ink">{datum?.fullLabel ?? datum?.label}</p>
      <ul className="grid gap-0.5">
        {rows.map(({ s, value }) => (
          <li key={s.key} className="tnum flex items-center justify-between gap-4 text-muted-ink">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px]" style={s.outlined ? { border: `1px dashed ${s.color}` } : { backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="font-medium text-ink">{formatValue(value, unit, digits)}</span>
          </li>
        ))}
        {showTotal && rows.length > 1 ? (
          <li className="tnum mt-1 flex justify-between gap-4 border-t border-line pt-1 text-muted-ink">
            Total <span className="font-medium text-ink">{formatValue(total, unit, digits)}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** Vertical bars: one series, grouped series, or a stack. One y-axis, always from zero. */
export function BarSeriesChart({
  data,
  series,
  unit,
  digits = 1,
  stacked = false,
  height = 220,
  yMax,
}: {
  data: Datum[];
  series: Series[];
  unit: string;
  digits?: number;
  stacked?: boolean;
  height?: number;
  yMax?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 22, right: 4, bottom: 0, left: 0 }} barCategoryGap={stacked || series.length === 1 ? "28%" : "22%"} barGap={2}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={14} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={unit === "%" ? 40 : 46}
          domain={[0, yMax ?? "auto"]}
          allowDecimals={digits > 0}
          tickFormatter={(v: number) => (unit === "%" ? `${v}%` : v.toLocaleString("en-US"))}
          label={unit === "%" ? undefined : { value: unit, position: "insideTopLeft", offset: 0, dy: -22, style: { ...AXIS, fill: "#717b73" } }}
        />
        <Tooltip cursor={{ fill: "rgba(32,39,32,0.04)" }} content={<ChartTooltip series={series} unit={unit} digits={digits} showTotal={stacked} />} isAnimationActive={false} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? "stack" : undefined}
            fill={s.outlined ? "#ffffff" : s.color}
            stroke={s.outlined ? s.color : "#ffffff"}
            strokeWidth={s.outlined ? 1.25 : stacked ? 1.5 : 0}
            strokeDasharray={s.outlined ? "4 3" : undefined}
            radius={stacked ? (i === series.length - 1 ? [3, 3, 0, 0] : 0) : [4, 4, 0, 0]}
            maxBarSize={stacked || series.length === 1 ? 34 : 18}
            isAnimationActive={!reduced}
            animationDuration={500}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars, one per category, coloured by entity and labelled directly. */
export function CategoryBarChart({ data, unit, digits = 1 }: { data: { label: string; value: number; display: string; color: string }[]; unit: string; digits?: number }) {
  const reduced = useReducedMotion();
  const series: Series[] = [{ key: "value", label: unit === "%" ? "Share" : "Time", color: "#366b54" }];
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44 + 16)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 112, bottom: 0, left: 0 }} barCategoryGap="30%">
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis type="category" dataKey="label" tick={{ ...AXIS, fontSize: 12, fill: "#202720" }} tickLine={false} axisLine={false} width={72} />
        <Tooltip cursor={{ fill: "rgba(32,39,32,0.04)" }} content={<ChartTooltip series={series} unit={unit} digits={digits} />} isAnimationActive={false} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={!reduced} animationDuration={500}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
          <LabelList dataKey="display" position="right" style={{ fontSize: 12, fill: "#202720", fontVariantNumeric: "tabular-nums" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Weekly bars (recessive) with a trailing-average line on the same axis and unit. */
export function TrendChart({ data, barKey, lineKey, barLabel, lineLabel, unit, height = 240 }: { data: Datum[]; barKey: string; lineKey: string; barLabel: string; lineLabel: string; unit: string; height?: number }) {
  const reduced = useReducedMotion();
  const series: Series[] = [
    { key: lineKey, label: lineLabel, color: "#366b54" },
    { key: barKey, label: barLabel, color: "#dce8dc" },
  ];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={14} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={44}
          domain={[0, "auto"]}
          label={{ value: unit, position: "insideTopLeft", offset: 0, dy: -22, style: { ...AXIS, fill: "#717b73" } }}
        />
        <Tooltip cursor={{ stroke: "#c9cdc2" }} content={<ChartTooltip series={series} unit={unit} digits={1} />} isAnimationActive={false} />
        <Line dataKey={barKey} name={barLabel} stroke="#b9c9ba" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 2.5, fill: "#b9c9ba", strokeWidth: 0 }} activeDot={{ r: 4 }} isAnimationActive={false} />
        <Line dataKey={lineKey} name={lineLabel} stroke="#366b54" strokeWidth={2} dot={{ r: 4, fill: "#366b54", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={!reduced} animationDuration={500} />
      </LineChart>
    </ResponsiveContainer>
  );
}
