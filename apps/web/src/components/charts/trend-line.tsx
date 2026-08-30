"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { VizEmpty, VizFrame, type VizSeriesKey } from "./chart-frame";
import { seriesColor } from "./viz-palette";

export interface TrendPoint {
  label: string;
  value: number | null;
}

export interface TrendSeries {
  id: string;
  label: string;
  points: TrendPoint[];
  color?: string;
  /** Draws a horizontal reference band, e.g. a normal clinical range. */
  band?: { low: number; high: number };
}

const PAD = { top: 14, right: 18, bottom: 24, left: 40 };

/**
 * Change over time.
 *
 * One shared y-scale, always. Two measures of different magnitude get two
 * charts or an indexed common base — never a second axis, which is the
 * single most misread thing you can put on a screen: with two scales the
 * lines cross wherever the author happened to set them, and the crossing
 * looks like a finding.
 */
export function TrendLine({
  title,
  subtitle,
  series,
  unit,
  height = 220,
  yMin,
  yMax,
  valueFormatter = (value: number) => String(value),
  footnote,
  emptyMessage = "No readings yet",
  emptyHint,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  series: TrendSeries[];
  unit?: string;
  height?: number;
  yMin?: number;
  yMax?: number;
  valueFormatter?: (value: number) => string;
  footnote?: string;
  emptyMessage?: string;
  emptyHint?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 640;
  const plotWidth = width - PAD.left - PAD.right;
  const plotHeight = height - PAD.top - PAD.bottom;

  const labels = series[0]?.points.map((point) => point.label) ?? [];
  const pointCount = labels.length;

  const scale = useMemo(() => {
    const values = series.flatMap((entry) =>
      entry.points
        .map((point) => point.value)
        .filter((value): value is number => value !== null),
    );

    const bandValues = series.flatMap((entry) =>
      entry.band ? [entry.band.low, entry.band.high] : [],
    );

    const all = [...values, ...bandValues];
    if (all.length === 0) return null;

    const rawLow = yMin ?? Math.min(...all);
    const rawHigh = yMax ?? Math.max(...all);
    const spread = rawHigh - rawLow || Math.abs(rawHigh) || 1;
    const low = yMin ?? rawLow - spread * 0.12;
    const high = yMax ?? rawHigh + spread * 0.12;

    return { low, high, span: high - low || 1 };
  }, [series, yMin, yMax]);

  const legend: VizSeriesKey[] = series.map((entry, index) => {
    const last = [...entry.points].reverse().find((point) => point.value !== null);

    return {
      id: entry.id,
      label: entry.label,
      color: entry.color ?? seriesColor(index),
      value: last?.value != null ? valueFormatter(last.value) : "—",
      detail: last?.label,
    };
  });

  if (!scale || pointCount === 0) {
    return (
      <VizFrame
        title={title}
        subtitle={subtitle}
        actions={actions}
        footnote={footnote}
        className={className}
      >
        <VizEmpty message={emptyMessage} hint={emptyHint} height={height} />
      </VizFrame>
    );
  }

  const xFor = (index: number) =>
    PAD.left +
    (pointCount === 1 ? plotWidth / 2 : (index / (pointCount - 1)) * plotWidth);

  const yFor = (value: number) =>
    PAD.top + plotHeight - ((value - scale.low) / scale.span) * plotHeight;

  const ticks = niceTicks(scale.low, scale.high, 4);
  const columnWidth = plotWidth / Math.max(pointCount, 1);

  return (
    <VizFrame
      title={title}
      subtitle={subtitle}
      actions={actions}
      series={series.length >= 2 ? legend : undefined}
      footnote={footnote}
      tableCaption={unit ? `Values in ${unit}` : undefined}
      className={className}
    >
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${title}. ${legend
            .map((entry) => `${entry.label} latest ${entry.value}`)
            .join(". ")}`}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Reference bands sit under everything: context, not data. */}
          {series.map((entry, index) =>
            entry.band ? (
              <rect
                key={`band-${entry.id}`}
                x={PAD.left}
                y={yFor(entry.band.high)}
                width={plotWidth}
                height={Math.max(yFor(entry.band.low) - yFor(entry.band.high), 1)}
                fill={entry.color ?? seriesColor(index)}
                opacity={0.08}
              />
            ) : null,
          )}

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke="var(--viz-grid)"
                strokeWidth={1}
              />

              <text
                x={PAD.left - 8}
                y={yFor(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill="var(--viz-muted)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatTick(tick)}
              </text>
            </g>
          ))}

          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={PAD.top + plotHeight}
            y2={PAD.top + plotHeight}
            stroke="var(--viz-axis)"
            strokeWidth={1}
          />

          {series.map((entry, index) => {
            const color = entry.color ?? seriesColor(index);
            const path = buildPath(entry.points, xFor, yFor);
            if (!path) return null;

            return (
              <g key={entry.id}>
                <path
                  className="wf-viz-line"
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1000}
                  style={
                    {
                      strokeDasharray: 1000,
                      "--wf-viz-draw-len": 1000,
                    } as CSSProperties
                  }
                />

                {entry.points.map((point, pointIndex) =>
                  point.value === null ? null : (
                    <circle
                      key={`${entry.id}-dot-${pointIndex}`}
                      cx={xFor(pointIndex)}
                      cy={yFor(point.value)}
                      r={hoverIndex === pointIndex ? 5 : 3.5}
                      fill={color}
                      stroke="var(--viz-surface)"
                      strokeWidth={2}
                    />
                  ),
                )}
              </g>
            );
          })}

          {hoverIndex !== null ? (
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
              stroke="var(--viz-axis)"
              strokeWidth={1}
            />
          ) : null}

          {/* Hit targets are the whole column, far wider than the dot. */}
          {labels.map((label, index) => (
            <rect
              key={`hit-${index}`}
              className="wf-viz-hit"
              x={xFor(index) - columnWidth / 2}
              y={PAD.top}
              width={columnWidth}
              height={plotHeight}
              onMouseEnter={() => setHoverIndex(index)}
            />
          ))}

          {labels.map((label, index) =>
            shouldLabelTick(index, pointCount) ? (
              <text
                key={`tick-${index}`}
                x={xFor(index)}
                y={height - 6}
                textAnchor={
                  index === 0 ? "start" : index === pointCount - 1 ? "end" : "middle"
                }
                fontSize={10}
                fill="var(--viz-muted)"
              >
                {label}
              </text>
            ) : null,
          )}
        </svg>

        {hoverIndex !== null ? (
          <div
            className="wf-viz-tip"
            style={{
              left: `${(xFor(hoverIndex) / width) * 100}%`,
              top: 4,
              transform:
                xFor(hoverIndex) > width * 0.6
                  ? "translate(-100%, 0)"
                  : "translate(8px, 0)",
            }}
          >
            <div className="font-semibold">{labels[hoverIndex]}</div>

            {series.map((entry, index) => {
              const point = entry.points[hoverIndex];
              if (!point || point.value === null) return null;

              return (
                <div key={entry.id} className="mt-1 flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    style={{
                      background: entry.color ?? seriesColor(index),
                      borderRadius: 999,
                      display: "inline-block",
                      height: 8,
                      width: 8,
                    }}
                  />

                  <span style={{ color: "var(--viz-ink-2)" }}>{entry.label}</span>

                  <span className="font-semibold">
                    {valueFormatter(point.value)}
                    {unit ? ` ${unit}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </VizFrame>
  );
}

function buildPath(
  points: TrendPoint[],
  xFor: (index: number) => number,
  yFor: (value: number) => number,
): string | null {
  let path = "";
  let penDown = false;

  points.forEach((point, index) => {
    if (point.value === null) {
      // A gap in the data is drawn as a gap. Bridging it with a straight
      // line would invent readings the patient never took.
      penDown = false;
      return;
    }

    const command = penDown ? "L" : "M";
    path += `${command}${xFor(index).toFixed(2)},${yFor(point.value).toFixed(2)} `;
    penDown = true;
  });

  return path.trim() || null;
}

function niceTicks(low: number, high: number, count: number): number[] {
  const span = high - low;
  if (span <= 0) return [low];

  const rawStep = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) *
    magnitude;

  const ticks: number[] = [];
  for (let tick = Math.ceil(low / step) * step; tick <= high; tick += step) {
    ticks.push(Number(tick.toFixed(6)));
  }

  return ticks;
}

function formatTick(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Thin the x-axis labels so they never collide on a narrow phone. */
function shouldLabelTick(index: number, total: number): boolean {
  if (total <= 6) return true;
  const stride = Math.ceil(total / 5);
  return index === 0 || index === total - 1 || index % stride === 0;
}
