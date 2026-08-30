"use client";

import { useId, useState, type ReactNode } from "react";

import { VIZ_INK } from "./viz-palette";

export interface VizSeriesKey {
  /** Stable identity for the entity. Colour follows this, never the rank. */
  id: string;
  label: string;
  color: string;
  /** Rendered beside the label in the legend, and in the table view. */
  value?: string;
  /** Optional second line, e.g. a share of the whole. */
  detail?: string;
}

/**
 * The shell every chart sits in: a title, an always-present legend once
 * there are two or more series, and a table view.
 *
 * The table is not optional polish. Three of the light-mode categorical
 * slots sit under 3:1 against white, and the documented relief for that is
 * visible labels or a table — so the frame ships both rather than leaving
 * the choice to each call site. It also carries the whole chart for a
 * screen reader, which no amount of SVG does on its own.
 */
export function VizFrame({
  title,
  subtitle,
  actions,
  series,
  footnote,
  tableCaption,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Omit for a single-series chart — one swatch just restates the title. */
  series?: VizSeriesKey[];
  footnote?: string;
  tableCaption?: string;
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const hasLegend = Boolean(series && series.length >= 2);

  return (
    <figure
      className={`wf-viz wf-surface wf-panel m-0 flex flex-col rounded-2xl p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <figcaption className="wf-ink text-sm font-semibold tracking-[-0.01em]">
            {title}
          </figcaption>

          {subtitle ? (
            <p className="wf-ink-2 mt-0.5 text-xs leading-5">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {actions}

          {series && series.length > 0 ? (
            <button
              type="button"
              aria-expanded={showTable}
              aria-controls={tableId}
              onClick={() => setShowTable((open) => !open)}
              className="wf-btn-quiet rounded-lg px-2 py-1 text-[11px] font-medium transition"
            >
              {showTable ? "Chart" : "Table"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex-1">{children}</div>

      {hasLegend ? (
        <ul className="wf-panel-divider mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
          {series?.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: entry.color }}
              />

              <span className="wf-ink-2 text-xs font-medium">
                {entry.label}
              </span>

              {entry.value ? (
                <span className="wf-ink text-xs font-semibold">
                  {entry.value}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {showTable && series ? (
        <div id={tableId} className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            {tableCaption ? (
              <caption className="wf-ink-2 pb-2 text-left text-[11px]">
                {tableCaption}
              </caption>
            ) : null}

            <thead>
              <tr className="wf-panel-divider border-b">
                <th scope="col" className="wf-ink-2 py-1.5 pr-3 font-medium">
                  Category
                </th>

                <th scope="col" className="wf-ink-2 py-1.5 pr-3 font-medium">
                  Value
                </th>

                <th scope="col" className="wf-ink-2 py-1.5 font-medium">
                  Share
                </th>
              </tr>
            </thead>

            <tbody>
              {series.map((entry) => (
                <tr key={entry.id} className="wf-panel-divider border-b last:border-0">
                  <th
                    scope="row"
                    className="wf-ink py-1.5 pr-3 font-medium"
                  >
                    {entry.label}
                  </th>

                  <td className="wf-ink py-1.5 pr-3 tabular-nums">
                    {entry.value ?? "—"}
                  </td>

                  <td className="wf-ink-2 py-1.5 tabular-nums">
                    {entry.detail ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {footnote ? (
        <p className="wf-ink-3 mt-3 text-[11px] leading-4">{footnote}</p>
      ) : null}
    </figure>
  );
}

/** Shown in place of a chart when the series is genuinely empty. */
export function VizEmpty({
  message,
  hint,
  height = 180,
}: {
  message: string;
  hint?: string;
  height?: number;
}) {
  return (
    <div
      className="wf-surface wf-empty flex flex-col items-center justify-center gap-1 rounded-xl text-center"
      style={{ minHeight: height }}
    >
      <p className="wf-ink-2 text-xs font-medium">{message}</p>

      {hint ? <p className="wf-ink-3 max-w-[26ch] text-[11px]">{hint}</p> : null}
    </div>
  );
}

export { VIZ_INK };
