"use client";

import { useMemo, useState } from "react";

import { VizEmpty, VizFrame, type VizSeriesKey } from "./chart-frame";
import { compactNumber, percentOf, seriesColor } from "./viz-palette";

export interface DonutSlice {
  /** Stable identity. Colour follows this, so a filter that removes a
   *  slice must not repaint the ones that survive. */
  id: string;
  label: string;
  value: number;
  /** Overrides the categorical slot — use only for status-meaning slices. */
  color?: string;
}

const MAX_SLICES = 6;
const GAP_DEGREES = 2.4;

/**
 * Part-to-whole at a glance.
 *
 * A donut is honest for exactly one job: "what is this made of", with few
 * segments and differences big enough to see. It is the wrong mark for
 * comparing close values and for anything over ~6 classes, so this
 * component enforces the ceiling itself — anything past the fifth slice
 * folds into a single "Other" segment rather than growing the palette.
 * If you need to compare the segments against each other, that is a bar
 * chart; if there are only two, that is a meter.
 *
 * The centre carries the figure the reader actually came for, so the
 * chart answers its question without a trip to the legend.
 */
export function DonutChart({
  title,
  subtitle,
  slices,
  centerValue,
  centerLabel,
  size = 200,
  thickness = 22,
  valueFormatter = (value: number) => compactNumber(value, 0),
  footnote,
  emptyMessage = "Nothing recorded yet",
  emptyHint,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  slices: DonutSlice[];
  /** Defaults to the total. Pass a string to lead with something else. */
  centerValue?: string;
  centerLabel?: string;
  size?: number;
  thickness?: number;
  valueFormatter?: (value: number) => string;
  footnote?: string;
  emptyMessage?: string;
  emptyHint?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const folded = useMemo(() => foldToCeiling(slices), [slices]);
  const total = useMemo(
    () => folded.reduce((sum, slice) => sum + Math.max(0, slice.value), 0),
    [folded],
  );

  const legend: VizSeriesKey[] = folded.map((slice, index) => ({
    id: slice.id,
    label: slice.label,
    color: slice.color ?? seriesColor(index),
    value: valueFormatter(slice.value),
    detail: `${percentOf(slice.value, total).toFixed(0)}%`,
  }));

  if (total <= 0) {
    return (
      <VizFrame
        title={title}
        subtitle={subtitle}
        actions={actions}
        footnote={footnote}
        className={className}
      >
        <VizEmpty message={emptyMessage} hint={emptyHint} height={size} />
      </VizFrame>
    );
  }

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // A gap in the surface colour is what separates touching segments — not a
  // stroke drawn around each one, which would add ink that is not data. The
  // gap is dropped when a slice is too small to survive losing it.
  //
  // Each arc's start is the sum of every sweep before it. That runs as a
  // reduce rather than a `let` cursor mutated inside `.map`: reassigning a
  // variable during render is exactly what the React Compiler refuses to
  // memoize, and the fold below can change `folded` between renders.
  const arcs = folded.reduce<
    {
      slice: DonutSlice;
      color: string;
      dash: number;
      offset: number;
      share: number;
    }[]
  >((accumulated, slice, index) => {
    const share = Math.max(0, slice.value) / total;
    const sweep = share * 360;
    const gap = sweep > GAP_DEGREES * 2 && folded.length > 1 ? GAP_DEGREES : 0;

    const startDegrees = accumulated.reduce(
      (sum, arc) => sum + (Math.max(0, arc.slice.value) / total) * 360,
      0,
    );

    return [
      ...accumulated,
      {
        slice,
        color: slice.color ?? seriesColor(index),
        dash: Math.max(((sweep - gap) / 360) * circumference, 0),
        offset: (startDegrees / 360) * circumference,
        share,
      },
    ];
  }, []);

  const active = hovered ? arcs.find((arc) => arc.slice.id === hovered) : null;

  return (
    <VizFrame
      title={title}
      subtitle={subtitle}
      actions={actions}
      series={legend}
      footnote={footnote}
      tableCaption={`${title} — ${valueFormatter(total)} total`}
      className={className}
    >
      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label={`${title}. ${arcs
              .map(
                (arc) =>
                  `${arc.slice.label} ${valueFormatter(arc.slice.value)}, ${(
                    arc.share * 100
                  ).toFixed(0)} percent`,
              )
              .join(". ")}`}
            style={{ transform: "rotate(-90deg)", overflow: "visible" }}
          >
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="var(--viz-grid)"
              strokeWidth={thickness}
            />

            {arcs.map((arc) => (
              <circle
                key={arc.slice.id}
                className="wf-viz-seg wf-viz-arc"
                data-dim={hovered !== null && hovered !== arc.slice.id}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={hovered === arc.slice.id ? thickness + 4 : thickness}
                strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                strokeDashoffset={-arc.offset}
                strokeLinecap="butt"
                onMouseEnter={() => setHovered(arc.slice.id)}
                onMouseLeave={() => setHovered(null)}
                style={
                  {
                    cursor: "default",
                    transition: "stroke-width 160ms ease, opacity 160ms ease",
                    "--wf-viz-arc-len": circumference,
                    "--wf-viz-arc-off": -arc.offset,
                  } as React.CSSProperties
                }
              />
            ))}
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <span className="wf-ink text-[26px] font-semibold leading-none tracking-[-0.03em]">
              {active
                ? valueFormatter(active.slice.value)
                : (centerValue ?? valueFormatter(total))}
            </span>

            <span className="wf-ink-2 mt-1 line-clamp-2 text-[11px] font-medium leading-4">
              {active ? active.slice.label : (centerLabel ?? "Total")}
            </span>

            {active ? (
              <span className="wf-ink-3 mt-0.5 text-[11px] font-semibold">
                {(active.share * 100).toFixed(0)}%
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </VizFrame>
  );
}

/**
 * Never solve "too many classes" by generating more hues — a ninth hue is
 * indistinguishable from an existing one under colour-blind simulation and
 * breaks every check the palette passed. The tail folds instead.
 */
function foldToCeiling(slices: DonutSlice[]): DonutSlice[] {
  const positive = slices.filter((slice) => slice.value > 0);
  if (positive.length <= MAX_SLICES) return positive;

  const ranked = [...positive].sort((a, b) => b.value - a.value);
  const head = ranked.slice(0, MAX_SLICES - 1);
  const tail = ranked.slice(MAX_SLICES - 1);

  return [
    ...head,
    {
      id: "__other",
      label: `Other (${tail.length})`,
      value: tail.reduce((sum, slice) => sum + slice.value, 0),
      color: "var(--viz-mute-mark)",
    },
  ];
}
