"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import { VizEmpty, VizFrame, type VizSeriesKey } from "./chart-frame";
import { compactNumber, percentOf, seriesColor, VIZ_STATUS, type VizStatus } from "./viz-palette";

export interface StackSegment {
  id: string;
  label: string;
  value: number;
  color?: string;
}

/**
 * Part-to-whole in one line.
 *
 * Where a donut answers "what is this made of" for one thing, the stacked
 * bar answers it in a strip that fits in a table row or a card header, and
 * it stays readable at any width. Segments are separated by a 2px gap in
 * the surface colour, never by a stroke drawn around each one — a border
 * is ink that is not data.
 */
export function StackedBar({
  segments,
  height = 10,
  showLegend = true,
  valueFormatter = (value: number) => compactNumber(value, 0),
  className = "",
}: {
  segments: StackSegment[];
  height?: number;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const present = segments.filter((segment) => segment.value > 0);
  const total = present.reduce((sum, segment) => sum + segment.value, 0);

  if (total <= 0) {
    return (
      <div
        className={`w-full rounded-full ${className}`}
        style={{ background: "var(--viz-grid)", height }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={`wf-viz wf-surface ${className}`}>
      <div
        className="flex w-full overflow-hidden rounded-full"
        style={{ background: "var(--viz-grid)", gap: 2, height }}
        role="img"
        aria-label={present
          .map(
            (segment) =>
              `${segment.label} ${valueFormatter(segment.value)}, ${percentOf(
                segment.value,
                total,
              ).toFixed(0)} percent`,
          )
          .join(". ")}
      >
        {present.map((segment, index) => (
          <div
            key={segment.id}
            className="wf-viz-seg h-full transition-[width] duration-500 first:rounded-l-full last:rounded-r-full"
            data-dim={hovered !== null && hovered !== segment.id}
            onMouseEnter={() => setHovered(segment.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: segment.color ?? seriesColor(index),
              width: `${percentOf(segment.value, total)}%`,
            }}
            title={`${segment.label}: ${valueFormatter(segment.value)}`}
          />
        ))}
      </div>

      {showLegend ? (
        <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {present.map((segment, index) => (
            <li key={segment.id} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ background: segment.color ?? seriesColor(index) }}
              />

              <span className="wf-ink-2 text-[11px]">{segment.label}</span>

              <span className="wf-ink text-[11px] font-semibold">
                {valueFormatter(segment.value)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** A stacked bar per row — the honest form for comparing compositions. */
export function StackedBarSet({
  title,
  subtitle,
  rows,
  keys,
  valueFormatter = (value: number) => compactNumber(value, 0),
  footnote,
  emptyMessage = "Nothing to compare yet",
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  rows: { id: string; label: string; segments: StackSegment[] }[];
  /** Legend entries, in the fixed slot order the rows use. */
  keys: { id: string; label: string; color?: string }[];
  valueFormatter?: (value: number) => string;
  footnote?: string;
  emptyMessage?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const legend: VizSeriesKey[] = keys.map((key, index) => {
    const total = rows.reduce(
      (sum, row) =>
        sum + (row.segments.find((segment) => segment.id === key.id)?.value ?? 0),
      0,
    );

    return {
      id: key.id,
      label: key.label,
      color: key.color ?? seriesColor(index),
      value: valueFormatter(total),
    };
  });

  if (rows.length === 0) {
    return (
      <VizFrame title={title} subtitle={subtitle} actions={actions} className={className}>
        <VizEmpty message={emptyMessage} />
      </VizFrame>
    );
  }

  return (
    <VizFrame
      title={title}
      subtitle={subtitle}
      actions={actions}
      series={legend}
      footnote={footnote}
      className={className}
    >
      <ul className="flex flex-col gap-3.5">
        {rows.map((row) => {
          const total = row.segments.reduce((sum, segment) => sum + segment.value, 0);

          return (
            <li key={row.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="wf-ink-2 truncate text-xs font-medium">
                  {row.label}
                </span>

                <span className="wf-ink shrink-0 text-xs font-semibold tabular-nums">
                  {valueFormatter(total)}
                </span>
              </div>

              <StackedBar
                className="mt-1.5"
                segments={row.segments.map((segment) => ({
                  ...segment,
                  color:
                    segment.color ??
                    seriesColor(keys.findIndex((key) => key.id === segment.id)),
                }))}
                showLegend={false}
                valueFormatter={valueFormatter}
              />
            </li>
          );
        })}
      </ul>
    </VizFrame>
  );
}

/**
 * A meter bent into a ring.
 *
 * This is the meter form, not a two-slice pie: one value against one
 * limit, with the unfilled track a lighter step of the fill's own ramp so
 * the state reads across the whole arc. It exists because a square tile
 * on a dashboard grid reads better round than as a stub of a bar — the
 * encoding is identical.
 */
export function RadialMeter({
  value,
  target,
  label,
  caption,
  status,
  size = 108,
  thickness = 9,
  formatter,
  className = "",
}: {
  value: number;
  target: number;
  label: string;
  caption?: string;
  status?: VizStatus;
  size?: number;
  thickness?: number;
  formatter?: (value: number, target: number) => string;
  className?: string;
}) {
  const share = target > 0 ? Math.max(0, Math.min(value / target, 1)) : 0;
  const pct = Math.round(share * 100);

  const tone =
    status ??
    (share >= 0.85 ? "good" : share >= 0.6 ? "warning" : share > 0 ? "serious" : "neutral");

  const fill = VIZ_STATUS[tone];
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = share * circumference;

  return (
    <div className={`wf-viz wf-surface flex flex-col items-center gap-2 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}
          role="img"
          aria-label={`${label}: ${value} of ${target}, ${pct} percent`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={fill}
            strokeWidth={thickness}
            opacity={0.16}
          />

          <circle
            className="wf-viz-arc"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={fill}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
            style={
              {
                "--wf-viz-arc-len": circumference,
                "--wf-viz-arc-off": 0,
              } as CSSProperties
            }
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="wf-ink text-lg font-semibold leading-none tracking-[-0.02em]">
            {formatter ? formatter(value, target) : `${pct}%`}
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="wf-ink text-[11px] font-semibold leading-4">{label}</p>

        {caption ? (
          <p className="wf-ink-3 text-[11px] leading-4">{caption}</p>
        ) : null}
      </div>
    </div>
  );
}
