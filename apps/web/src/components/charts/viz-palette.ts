/**
 * The chart palette, as roles.
 *
 * These are `var(--viz-*)` references, not hex. The real values live in
 * `app/globals.css` under `.wf-viz`, in both light and dark steps, so a
 * chart's colours follow the theme without any component re-reading the
 * DOM. Import the roles from here; never write a hex literal into a chart.
 *
 * The eight categorical slots are assigned IN ORDER and never cycled: the
 * ordering is what makes adjacent pairs separable under colour-blind
 * simulation, so a chart that shuffles them, or that generates a ninth
 * hue, breaks the guarantee. A ninth series folds into "Other", facets
 * into small multiples, or moves to a table.
 */

export const VIZ_SERIES = [
  "var(--viz-1)",
  "var(--viz-2)",
  "var(--viz-3)",
  "var(--viz-4)",
  "var(--viz-5)",
  "var(--viz-6)",
  "var(--viz-7)",
  "var(--viz-8)",
] as const;

/**
 * The all-pairs cap. Forms where every series can land beside every other
 * one — scatter, bubble, small multiples — hold to the first three slots,
 * which are the only ones that clear the floors with all pairs in play.
 * Adjacent forms (stacked bars, grouped bars, lines) may use all eight.
 */
export const VIZ_SERIES_ALL_PAIRS_CAP = 3;

export const VIZ_SEQUENTIAL = [
  "var(--viz-seq-100)",
  "var(--viz-seq-250)",
  "var(--viz-seq-400)",
  "var(--viz-seq-550)",
  "var(--viz-seq-700)",
] as const;

/** Ordinal marks start at index 1 — step 100 is too near the surface. */
export const VIZ_ORDINAL = VIZ_SEQUENTIAL.slice(1);

export type VizStatus = "good" | "warning" | "serious" | "critical" | "neutral";

export const VIZ_STATUS: Record<VizStatus, string> = {
  good: "var(--viz-good)",
  warning: "var(--viz-warning)",
  serious: "var(--viz-serious)",
  critical: "var(--viz-critical)",
  neutral: "var(--viz-mute-mark)",
};

export const VIZ_INK = {
  primary: "var(--viz-ink)",
  secondary: "var(--viz-ink-2)",
  muted: "var(--viz-muted)",
  grid: "var(--viz-grid)",
  axis: "var(--viz-axis)",
  surface: "var(--viz-surface)",
  mute: "var(--viz-mute-mark)",
} as const;

/** Colour for categorical slot `index`, wrapping only past the ceiling. */
export function seriesColor(index: number): string {
  return VIZ_SERIES[index % VIZ_SERIES.length] as string;
}

/**
 * Compact value formatting for stat tiles and direct labels: 1,284 —
 * 12.9K — 4.2M. Large standalone figures stay proportional; only columns
 * of numbers get tabular figures, which is a CSS concern, not this one.
 */
export function compactNumber(value: number, fractionDigits = 1): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(fractionDigits)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(fractionDigits)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: fractionDigits });
}

export function percentOf(value: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return (value / total) * 100;
}
