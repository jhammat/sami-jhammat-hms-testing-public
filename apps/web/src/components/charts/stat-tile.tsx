"use client";

import type { CSSProperties, ReactNode } from "react";

import { VIZ_STATUS, type VizStatus } from "./viz-palette";

/**
 * A single current value.
 *
 * The most common charting mistake is drawing a one-bar bar chart or a
 * two-slice pie when the answer is just a number. This is that number,
 * with room for the two things that give it meaning: how it moved, and
 * the shape of how it got here.
 *
 * The value uses proportional figures, not tabular: `tabular-nums` gives
 * every digit the width of a zero, which looks loose at display size.
 * Tabular figures belong in columns that must line up.
 */
export function StatTile({
  label,
  value,
  unit,
  delta,
  trend,
  status,
  icon,
  hint,
  href,
  className = "",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: {
    value: string;
    direction: "up" | "down" | "flat";
    /** Whether "up" is the good direction. Falls and rises mean opposite
     *  things for pain and for step count, so the caller decides. */
    upIsGood?: boolean;
    /**
     * Set "neutral" when neither direction is good or bad on its own.
     * A vital is the case that matters: blood pressure falling from 124
     * to 119 is movement toward the middle of the range, not a decline,
     * and colouring it red tells a post-operative patient their reading
     * got worse when it did not. Neutral still shows the arrow, so the
     * direction is legible — it just refuses to judge it.
     */
    tone?: "auto" | "neutral";
    period?: string;
  };
  trend?: number[];
  status?: VizStatus;
  icon?: ReactNode;
  hint?: string;
  href?: string;
  className?: string;
}) {
  const accent = status ? VIZ_STATUS[status] : "var(--viz-1)";

  const deltaTone =
    delta === undefined ||
    delta.direction === "flat" ||
    delta.tone === "neutral"
      ? "var(--viz-muted)"
      : (delta.direction === "up") === (delta.upIsGood ?? true)
        ? "var(--viz-good-ink)"
        : "var(--viz-critical-ink)";

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="wf-ink-2 text-xs font-medium leading-5">{label}</p>

        {icon ? (
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in srgb, var(--wf-tile-accent) 12%, transparent)", color: accent }}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <p className="mt-2 flex items-baseline gap-1">
        <span className="wf-ink text-[28px] font-semibold leading-none tracking-[-0.03em]">
          {value}
        </span>

        {unit ? (
          <span className="wf-ink-3 text-xs font-medium">{unit}</span>
        ) : null}
      </p>

      {delta || hint ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[11px] leading-4">
          {delta ? (
            <span className="font-semibold" style={{ color: deltaTone }}>
              {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "—"}{" "}
              {delta.value}
            </span>
          ) : null}

          {delta?.period ? (
            <span className="wf-ink-3">{delta.period}</span>
          ) : null}

          {hint ? <span className="wf-ink-3">{hint}</span> : null}
        </p>
      ) : null}

      {trend && trend.length > 1 ? (
        <div className="mt-3">
          <Sparkline values={trend} color={accent} />
        </div>
      ) : null}
    </>
  );

  const shell = `wf-viz wf-surface wf-panel group relative flex flex-col overflow-hidden rounded-2xl p-4 transition duration-300 ${
    href ? "hover:-translate-y-0.5" : ""
  } ${className}`;

  const style = { "--wf-tile-accent": accent } as CSSProperties;

  const accentRail = (
    <span
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-[3px]"
      style={{ background: accent, opacity: 0.9 }}
    />
  );

  if (href) {
    return (
      <a href={href} className={shell} style={style}>
        {accentRail}
        {body}
      </a>
    );
  }

  return (
    <div className={shell} style={style}>
      {accentRail}
      {body}
    </div>
  );
}

/**
 * The 12-point context line under a stat tile. Deliberately axis-less and
 * label-less: it shows shape, and the tile above it carries the value.
 */
export function Sparkline({
  values,
  color = "var(--viz-1)",
  width = 120,
  height = 28,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const recent = values.slice(-12);
  if (recent.length < 2) return null;

  const low = Math.min(...recent);
  const high = Math.max(...recent);
  const span = high - low || 1;

  const xFor = (index: number) => (index / (recent.length - 1)) * width;
  const yFor = (value: number) => height - 2 - ((value - low) / span) * (height - 4);

  const path = recent
    .map((value, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(1)},${yFor(value).toFixed(1)}`)
    .join(" ");

  const area = `${path} L${width},${height} L0,${height} Z`;
  const lastValue = recent[recent.length - 1] as number;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <path d={area} fill={color} opacity={0.1} />

      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx={xFor(recent.length - 1)}
        cy={yFor(lastValue)}
        r={3}
        fill={color}
        stroke="var(--viz-surface)"
        strokeWidth={2}
      />
    </svg>
  );
}

/**
 * A single ratio against a limit — adherence, target steps, calorie goal.
 *
 * Not a two-slice pie. The unfilled track is a lighter step of the fill's
 * own ramp so the state reads across the whole bar rather than only where
 * the fill stops.
 */
export function Meter({
  label,
  value,
  target,
  unit,
  status,
  caption,
  className = "",
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
  status?: VizStatus;
  caption?: string;
  className?: string;
}) {
  const share = target > 0 ? Math.min(value / target, 1) : 0;
  const pct = Math.round(share * 100);

  const tone =
    status ??
    (share >= 0.85 ? "good" : share >= 0.6 ? "warning" : share > 0 ? "serious" : "neutral");

  const fill = VIZ_STATUS[tone];

  return (
    <div className={`wf-viz wf-surface ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="wf-ink-2 text-xs font-medium">{label}</span>

        <span className="wf-ink text-xs font-semibold tabular-nums">
          {value.toLocaleString("en-US")}
          {unit ? ` ${unit}` : ""}
          <span className="wf-ink-3 font-normal">
            {" / "}
            {target.toLocaleString("en-US")}
          </span>
        </span>
      </div>

      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--wf-meter-fill) 16%, transparent)", ["--wf-meter-fill" as string]: fill } as CSSProperties}
      >
        <div
          className="h-full rounded-r-[4px] transition-[width] duration-700"
          style={{ background: fill, width: `${Math.max(pct, value > 0 ? 3 : 0)}%` }}
        />
      </div>

      <p className="wf-ink-3 mt-1.5 text-[11px]">
        <span className="wf-ink-2 font-semibold">{pct}%</span>
        {caption ? ` · ${caption}` : ""}
      </p>
    </div>
  );
}
