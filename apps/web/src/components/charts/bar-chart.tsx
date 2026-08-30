"use client";

import { useState, type ReactNode } from "react";

import { VizEmpty, VizFrame, type VizSeriesKey } from "./chart-frame";
import { compactNumber, percentOf, seriesColor } from "./viz-palette";

export interface BarDatum {
  id: string;
  label: string;
  value: number;
  /** Overrides the ramp — for status meaning only, never for variety. */
  color?: string;
  /** Secondary line under the label, e.g. a date or a count. */
  detail?: string;
}

/**
 * Compare magnitude, low to high.
 *
 * Horizontal by default: category names in a clinic are long ("Assisted
 * ambulation", "Serosanguinous"), and a horizontal bar gives the label a
 * full line instead of rotating it 45 degrees.
 *
 * Colour is sequential by default — one hue, more-is-darker — because the
 * job here is magnitude, not identity. Pass `categorical` only when the
 * bars genuinely are different entities the reader must tell apart.
 */
export function BarChart({
  title,
  subtitle,
  data,
  categorical = false,
  /** Highlights one bar and greys the rest — the honest form when the
   *  story is "this one", not "here are eight things". */
  emphasize,
  valueFormatter = (value: number) => compactNumber(value, 0),
  maxValue,
  footnote,
  emptyMessage = "Nothing to compare yet",
  emptyHint,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  data: BarDatum[];
  categorical?: boolean;
  emphasize?: string;
  valueFormatter?: (value: number) => string;
  maxValue?: number;
  footnote?: string;
  emptyMessage?: string;
  emptyHint?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const total = data.reduce((sum, datum) => sum + Math.max(0, datum.value), 0);
  const ceiling = maxValue ?? Math.max(...data.map((datum) => datum.value), 1);

  const colorFor = (datum: BarDatum, index: number): string => {
    if (datum.color) return datum.color;
    if (emphasize) {
      return datum.id === emphasize ? "var(--viz-1)" : "var(--viz-mute-mark)";
    }
    if (categorical) return seriesColor(index);

    // Sequential: darker with magnitude, so the ramp itself carries the
    // comparison and the reader never has to consult a legend.
    const steps = ["var(--viz-seq-250)", "var(--viz-seq-400)", "var(--viz-seq-550)", "var(--viz-seq-700)"];
    const share = ceiling > 0 ? datum.value / ceiling : 0;
    const step = Math.min(steps.length - 1, Math.floor(share * steps.length));
    return steps[Math.max(step, 0)] as string;
  };

  const legend: VizSeriesKey[] | undefined = categorical
    ? data.map((datum, index) => ({
        id: datum.id,
        label: datum.label,
        color: colorFor(datum, index),
        value: valueFormatter(datum.value),
        detail: `${percentOf(datum.value, total).toFixed(0)}%`,
      }))
    : undefined;

  if (data.length === 0 || ceiling <= 0) {
    return (
      <VizFrame
        title={title}
        subtitle={subtitle}
        actions={actions}
        footnote={footnote}
        className={className}
      >
        <VizEmpty message={emptyMessage} hint={emptyHint} />
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
      <ul className="flex flex-col gap-3">
        {data.map((datum, index) => {
          const share = Math.max(0, datum.value) / ceiling;
          const isHovered = hovered === datum.id;

          return (
            <li
              key={datum.id}
              onMouseEnter={() => setHovered(datum.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="wf-ink-2 truncate text-xs font-medium">
                  {datum.label}
                </span>

                {/* The value rides the bar rather than an axis: with a
                    handful of rows, direct labels beat gridlines. */}
                <span className="wf-ink shrink-0 text-xs font-semibold tabular-nums">
                  {valueFormatter(datum.value)}
                </span>
              </div>

              <div
                className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full"
                style={{ background: "var(--viz-grid)" }}
              >
                <div
                  className="h-full rounded-r-[4px] transition-[width,opacity] duration-500"
                  style={{
                    background: colorFor(datum, index),
                    opacity: hovered && !isHovered ? 0.45 : 1,
                    width: `${Math.max(share * 100, datum.value > 0 ? 2 : 0)}%`,
                  }}
                />
              </div>

              {datum.detail ? (
                <p className="wf-ink-3 mt-1 text-[11px]">{datum.detail}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </VizFrame>
  );
}
