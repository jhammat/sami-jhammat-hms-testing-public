"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { X } from "lucide-react";

/**
 * The glass layer shared by the allied health portals — physiotherapy and
 * dietetics.
 *
 * Everything here is presentation. The surfaces reuse the product's `wfg-*`
 * frosted system so the portals sit on the same canvas as the rest of the
 * shell, and every control is theme-aware through those tokens rather than
 * through hard-coded light or dark colours.
 *
 * The controls in the second half of the file are the reason this file
 * exists. An allied clinician sets numbers all day — repetitions, holds,
 * pain, distance, angles, weights, calories, enzyme units — and a row of
 * bare number inputs makes that work slower and less legible than it needs
 * to be. Each control below is keyboard-operable and carries a real ARIA
 * role, so the visual affordance is an addition to the accessible control,
 * never a replacement for it.
 *
 * Every control also supports an explicitly UNSET state, because neither
 * portal is allowed to pre-fill a clinical number on a clinician's behalf.
 */

/* ================================================================== */
/* Surfaces                                                            */
/* ================================================================== */

export function GlassPanel({
  title,
  subtitle,
  icon,
  accent = "#22d3ee",
  actions,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  accent?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`wfg-panel relative overflow-hidden ${padded ? "p-5" : ""} ${className}`}>
      {title ? (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span
                aria-hidden
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                style={{ background: `linear-gradient(140deg, ${accent}, ${accent}99)` }}
              >
                {icon}
              </span>
            ) : null}

            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-50">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>

          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}

      {children}
    </section>
  );
}

export function GlassWell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`wfg-well p-4 ${className}`}>{children}</div>;
}

/**
 * The hero. An aurora gradient with soft blobs behind frosted content —
 * this is the one place in the workspace that carries saturated colour, so
 * the rest of the page can stay quiet.
 */
export function AuroraHero({
  eyebrow,
  title,
  description,
  chips,
  actions,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  chips?: { label: string; value?: string; solid?: boolean }[];
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="wfg-aurora px-6 py-7 sm:px-8">
      <span
        aria-hidden
        className="wfg-aurora-blob"
        style={{ background: "#22d3ee66", height: 300, width: 300, left: -60, top: -120 }}
      />
      <span
        aria-hidden
        className="wfg-aurora-blob"
        style={{ background: "#a78bfa55", height: 280, width: 280, right: -40, bottom: -140 }}
      />
      <span
        aria-hidden
        className="wfg-aurora-blob"
        style={{ background: "#34d39944", height: 220, width: 220, right: "34%", top: -110 }}
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="wfg-aurora-eyebrow text-[11px] font-semibold uppercase tracking-[0.16em]">
            {eyebrow}
          </p>

          {/* An h2, not an h1: the application shell already renders the page
              title as this page's single h1. Two h1 elements with the same
              accessible name give a screen-reader user two "top" headings and
              no way to tell which is the page. The visual weight lives in the
              class, so nothing about the design changes. */}
          <h2 className="wfg-aurora-title mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            {title}
          </h2>

          <p className="wfg-aurora-body mt-2 text-sm leading-6">{description}</p>

          {chips && chips.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li
                  key={chip.label}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${
                    chip.solid
                      ? "border-white/25 bg-[rgb(255_255_255/0.20)] text-white"
                      : "border-white/15 bg-[rgb(255_255_255/0.08)] text-indigo-100/85"
                  }`}
                >
                  {chip.value ? (
                    <span className="font-semibold tabular-nums text-white">{chip.value}</span>
                  ) : null}
                  {chip.label}
                </li>
              ))}
            </ul>
          ) : null}

          {actions ? <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Buttons, chips, pills                                               */
/* ================================================================== */

type ButtonVariant = "solid" | "glass" | "ghost" | "danger" | "onAurora";

export function GlassButton({
  variant = "glass",
  accent = "#0891b2",
  size = "md",
  icon,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  accent?: string;
  size?: "sm" | "md";
  icon?: ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent";

  const sizing = size === "sm" ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs";

  const variants: Record<ButtonVariant, string> = {
    solid: "text-white shadow-md hover:brightness-110 active:brightness-95",
    glass:
      "wfg-control text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white",
    ghost:
      "text-slate-500 hover:bg-slate-500/10 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
    danger:
      "border border-rose-400/40 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-300",
    onAurora:
      "border border-white/25 bg-[rgb(255_255_255_/_0.15)] text-white backdrop-blur hover:bg-[rgb(255_255_255_/_0.25)]",
  };

  return (
    <button
      type="button"
      className={`${base} ${sizing} ${variants[variant]} ${className}`}
      style={
        variant === "solid"
          ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }
          : undefined
      }
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function GlassChip({
  active = false,
  hue,
  count,
  onClick,
  children,
}: {
  active?: boolean;
  hue?: string;
  count?: number;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
        active
          ? "border-transparent text-white shadow-sm"
          : "border-slate-300/60 bg-white/50 text-slate-600 hover:border-slate-400/70 dark:border-white/12 dark:bg-white/5 dark:text-slate-300"
      }`}
      style={active ? { background: hue ?? "#0891b2" } : undefined}
    >
      {hue && !active ? (
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: hue }} />
      ) : null}
      {children}
      {typeof count === "number" ? (
        <span
          className={`rounded-full px-1.5 text-[10px] tabular-nums ${
            active ? "bg-[rgb(255_255_255/0.25)]" : "bg-slate-900/8 dark:bg-white/10"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export type PillTone = "neutral" | "info" | "good" | "warning" | "critical";

const PILL_TONES: Record<PillTone, string> = {
  neutral:
    "border-slate-300/60 bg-slate-500/10 text-slate-600 dark:border-white/12 dark:text-slate-300",
  info: "border-sky-400/40 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  good: "border-emerald-400/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-400/40 bg-amber-500/14 text-amber-700 dark:text-amber-300",
  critical: "border-rose-400/40 bg-rose-500/12 text-rose-700 dark:text-rose-300",
};

export function Pill({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: PillTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PILL_TONES[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function Notice({
  tone,
  title,
  children,
  onDismiss,
}: {
  tone: "good" | "critical" | "info";
  title: string;
  children?: ReactNode;
  onDismiss?: () => void;
}) {
  const tones = {
    good: "border-emerald-400/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    critical: "border-rose-400/40 bg-rose-500/10 text-rose-800 dark:text-rose-200",
    info: "border-sky-400/40 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  } as const;

  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 backdrop-blur ${tones[tone]}`}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold">{title}</p>
        {children ? <div className="mt-1 text-[11px] leading-5 opacity-90">{children}</div> : null}
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="shrink-0 rounded-lg p-1 opacity-70 transition hover:opacity-100"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

/* ================================================================== */
/* Stats and readouts                                                  */
/* ================================================================== */

export function GlassStat({
  label,
  value,
  unit,
  hint,
  icon,
  accent = "#22d3ee",
  onClick,
  active = false,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  icon?: ReactNode;
  accent?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        {icon ? (
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-xl text-white"
            style={{ background: `linear-gradient(140deg, ${accent}, ${accent}aa)` }}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <p className="mt-2 flex items-baseline gap-1 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-slate-900 dark:text-white">
        {value}
        {unit ? (
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{unit}</span>
        ) : null}
      </p>

      {hint ? (
        <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </>
  );

  if (!onClick) {
    return <div className="wfg-tile p-4">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="wfg-tile p-4 text-left"
      style={active ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}55` } : undefined}
    >
      {body}
    </button>
  );
}

/** A single-value ring. Used for scores where the maximum is meaningful. */
export function ProgressRing({
  value,
  max,
  label,
  caption,
  accent = "#22d3ee",
  size = 108,
  thickness = 9,
  valueLabel,
}: {
  value: number;
  max: number;
  label: string;
  caption?: string;
  accent?: string;
  size?: number;
  thickness?: number;
  valueLabel?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const gradientId = useId();

  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <div className="relative" style={{ height: size, width: size }}>
        <svg
          height={size}
          width={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${label}: ${valueLabel ?? `${value} of ${max}`}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accent} />
              <stop offset="100%" stopColor={accent} stopOpacity="0.45" />
            </linearGradient>
          </defs>

          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            className="text-[rgb(15_23_42/0.09)] dark:text-[rgb(255_255_255/0.10)]"
          />

          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeDasharray={`${ratio * circumference} ${circumference}`}
            strokeLinecap="round"
            strokeWidth={thickness}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dasharray 600ms cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {valueLabel ?? value}
          </span>
          {caption ? (
            <span className="text-[10px] text-slate-500 dark:text-slate-400">{caption}</span>
          ) : null}
        </div>
      </div>

      <figcaption className="text-center text-[11px] font-medium text-slate-600 dark:text-slate-300">
        {label}
      </figcaption>
    </figure>
  );
}

/* ================================================================== */
/* Visual controls                                                     */
/* ================================================================== */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function quantise(value: number, min: number, step: number): number {
  return min + Math.round((value - min) / step) * step;
}

/**
 * A radial dial the therapist drags, with the same keyboard contract as a
 * native range input. `value === null` means nothing has been set yet — the
 * workspace never pre-fills a clinical number, so the dial has to be able to
 * show an unset state rather than a default that looks like a decision.
 */
export function Dial({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit,
  accent = "#22d3ee",
  size = 132,
  caption,
  formatValue,
}: {
  value: number | null;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  accent?: string;
  size?: number;
  caption?: string;
  formatValue?: (value: number) => string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const sweep = 270;
  const startAngle = 135;
  const thickness = 12;
  const radius = (size - thickness - 8) / 2;
  const centre = size / 2;
  const arcLength = (sweep / 360) * 2 * Math.PI * radius;
  const ratio = value === null ? 0 : clamp((value - min) / (max - min || 1), 0, 1);

  const pointFor = (fraction: number) => {
    const angle = ((startAngle + fraction * sweep) * Math.PI) / 180;
    return {
      x: centre + radius * Math.cos(angle),
      y: centre + radius * Math.sin(angle),
    };
  };

  const trackStart = pointFor(0);
  const trackEnd = pointFor(1);
  const knob = pointFor(ratio);

  const applyFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left - rect.width / 2;
      const y = clientY - rect.top - rect.height / 2;

      let degrees = (Math.atan2(y, x) * 180) / Math.PI;
      degrees = (degrees - startAngle + 360 + 360) % 360;
      if (degrees > sweep) {
        // Inside the 90° dead zone at the bottom — snap to the nearer end.
        degrees = degrees - sweep > (360 - sweep) / 2 ? 0 : sweep;
      }

      const raw = min + (degrees / sweep) * (max - min);
      onChange(clamp(quantise(raw, min, step), min, max));
    },
    [max, min, onChange, step],
  );

  useEffect(() => {
    if (!dragging) return;

    const move = (event: PointerEvent) => applyFromPointer(event.clientX, event.clientY);
    const stop = () => setDragging(false);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [applyFromPointer, dragging]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = value ?? min;
    const big = Math.max(step, Math.round((max - min) / 10));

    const moves: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: big,
      PageDown: -big,
    };

    if (event.key in moves) {
      event.preventDefault();
      onChange(clamp(current + moves[event.key]!, min, max));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      onChange(min);
    }

    if (event.key === "End") {
      event.preventDefault();
      onChange(max);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value === null ? "Not set" : `${value}${unit ? ` ${unit}` : ""}`}
        onKeyDown={handleKeyDown}
        className="relative touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
        style={{ height: size, width: size, cursor: dragging ? "grabbing" : "grab" }}
      >
        <svg
          ref={svgRef}
          height={size}
          width={size}
          viewBox={`0 0 ${size} ${size}`}
          onPointerDown={(event) => {
            event.preventDefault();
            setDragging(true);
            applyFromPointer(event.clientX, event.clientY);
          }}
        >
          <path
            d={`M ${trackStart.x} ${trackStart.y} A ${radius} ${radius} 0 1 1 ${trackEnd.x} ${trackEnd.y}`}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth={thickness}
            className="text-[rgb(15_23_42/0.09)] dark:text-[rgb(255_255_255/0.10)]"
          />

          <path
            d={`M ${trackStart.x} ${trackStart.y} A ${radius} ${radius} 0 1 1 ${trackEnd.x} ${trackEnd.y}`}
            fill="none"
            stroke={accent}
            strokeDasharray={`${ratio * arcLength} ${arcLength * 2}`}
            strokeLinecap="round"
            strokeWidth={thickness}
            style={{ transition: dragging ? "none" : "stroke-dasharray 220ms ease" }}
          />

          {value !== null ? (
            <circle
              cx={knob.x}
              cy={knob.y}
              r={thickness / 2 + 3}
              fill="#ffffff"
              stroke={accent}
              strokeWidth={3}
              style={{ transition: dragging ? "none" : "all 220ms ease" }}
            />
          ) : null}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {value === null ? (
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Not set</span>
          ) : (
            <>
              <span className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatValue ? formatValue(value) : value}
              </span>
              {unit ? (
                <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {unit}
                </span>
              ) : null}
            </>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] font-medium text-slate-600 dark:text-slate-300">
        {label}
      </p>

      {caption ? (
        <p className="max-w-[16rem] text-center text-[10px] leading-4 text-slate-500 dark:text-slate-400">
          {caption}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A slider whose track carries the meaning of the scale — pain runs green to
 * red, mobility runs red to green — so the number and the colour agree.
 */
export function GradientSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  hint,
  ramp,
  ticks,
  valueLabel,
}: {
  value: number | null;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  hint?: string;
  ramp: string[];
  ticks?: { value: number; label: string }[];
  valueLabel?: (value: number) => string;
}) {
  const id = useId();
  const ratio = value === null ? 0 : clamp((value - min) / (max - min || 1), 0, 1);
  const activeHue = ramp[Math.min(ramp.length - 1, Math.round(ratio * (ramp.length - 1)))];

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>

        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums text-white"
          style={{ background: value === null ? "#94a3b8" : activeHue }}
        >
          {value === null ? "Not set" : (valueLabel?.(value) ?? `${value}`)}
        </span>
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full"
          style={{ background: `linear-gradient(90deg, ${ramp.join(", ")})`, opacity: 0.85 }}
        />

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value ?? min}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-valuetext={value === null ? "Not set" : `${value}`}
          className="physio-range relative w-full cursor-pointer appearance-none bg-transparent"
          style={{ ["--physio-thumb" as string]: value === null ? "#94a3b8" : activeHue }}
        />
      </div>

      {ticks && ticks.length > 0 ? (
        <div className="mt-1.5 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
          {ticks.map((tick) => (
            <span key={tick.value}>{tick.label}</span>
          ))}
        </div>
      ) : null}

      {hint ? (
        <p className="mt-1.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Intelligently infers a realistic starting clinical hint/placeholder
 * based on the label, unit, or context.
 */
export function getSuggestedHint(label: string, unit?: string, placeholder?: string): string {
  if (placeholder) return placeholder;
  const l = label.toLowerCase();
  const u = (unit ?? "").toLowerCase();

  if (l.includes("weight") || u.includes("kg")) {
    if (l.includes("change") || l.includes("loss") || l.includes("surgery") || u.includes("negative")) {
      return "e.g. -2.5";
    }
    return "e.g. 70";
  }
  if (l.includes("height") || u.includes("cm")) {
    return "e.g. 175";
  }
  if (l.includes("energy") || l.includes("caloric") || u.includes("kcal")) {
    return "e.g. 2000";
  }
  if (l.includes("protein") || u.includes("g/day")) {
    return "e.g. 85";
  }
  if (l.includes("fluid") || u.includes("ml/day")) {
    return "e.g. 2200";
  }
  if (l.includes("fat")) {
    if (l.includes("snack")) return "e.g. 10";
    return "e.g. 25";
  }
  if (l.includes("floor")) {
    if (l.includes("snack")) return "e.g. 10000";
    return "e.g. 25000";
  }
  if (l.includes("rate") || l.includes("infusion") || u.includes("ml/hour") || u.includes("ml/hr")) {
    return "e.g. 60";
  }
  if (l.includes("hours") || u.includes("hours")) {
    return "e.g. 20";
  }
  if (l.includes("tug") || l.includes("timed") || (l.includes("hold") && u.includes("sec"))) {
    return "e.g. 12";
  }
  if (l.includes("walk") || l.includes("distance") || u.includes("metres")) {
    return "e.g. 400";
  }
  if (l.includes("sets")) {
    return "e.g. 3";
  }
  if (l.includes("reps") || l.includes("repetitions")) {
    return "e.g. 10";
  }
  if (l.includes("days")) {
    return "e.g. 7";
  }
  return "e.g. 0";
}

/** Plus/minus stepper with freeform number typing and clinical hints. */
export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit,
  accent = "#0891b2",
  placeholder,
  hint,
  defaultStart,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  unit?: string;
  accent?: string;
  placeholder?: string;
  hint?: string;
  defaultStart?: number;
}) {
  const id = useId();

  const resolvedPlaceholder = useMemo(
    () => getSuggestedHint(label, unit, placeholder),
    [label, unit, placeholder],
  );

  const parsedHintNumber = useMemo(() => {
    const match = resolvedPlaceholder.match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }, [resolvedPlaceholder]);

  const startBaseline = defaultStart ?? parsedHintNumber ?? (min !== undefined && min > 0 ? min : 0);

  const [localText, setLocalText] = useState<string>(() =>
    value !== null && value !== undefined ? String(value) : ""
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalText(value !== null && value !== undefined ? String(value) : "");
    }
  }, [value, isFocused]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;

    // Allow typing digits, negative sign at the front, and decimal point
    if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) {
      return;
    }

    setLocalText(raw);

    if (raw === "" || raw === "-") {
      onChange(null);
      return;
    }

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      // Allow entering any number directly without clamp obstruction
      onChange(parsed);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (localText === "" || localText === "-") {
      setLocalText("");
      onChange(null);
      return;
    }
    const parsed = parseFloat(localText);
    if (!isNaN(parsed)) {
      setLocalText(String(parsed));
      onChange(parsed);
    } else {
      setLocalText("");
      onChange(null);
    }
  };

  const handleIncrement = () => {
    if (value === null || value === undefined) {
      onChange(startBaseline);
      setLocalText(String(startBaseline));
      return;
    }
    const next = Math.round((value + step) * 1000) / 1000;
    const clamped = max !== undefined ? Math.min(max, next) : next;
    onChange(clamped);
    setLocalText(String(clamped));
  };

  const handleDecrement = () => {
    if (value === null || value === undefined) {
      const initial = Math.round((startBaseline - step) * 1000) / 1000;
      const clamped = min !== undefined ? Math.max(min, initial) : initial;
      onChange(clamped);
      setLocalText(String(clamped));
      return;
    }
    const next = Math.round((value - step) * 1000) / 1000;
    const clamped = min !== undefined ? Math.max(min, next) : next;
    onChange(clamped);
    setLocalText(String(clamped));
  };

  return (
    <div className="wfg-well px-3 py-2.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </label>
        {hint ? (
          <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{hint}</span>
        ) : null}
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={handleDecrement}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-300/60 text-sm font-semibold text-slate-600 transition hover:bg-slate-500/10 dark:border-white/12 dark:text-slate-300"
        >
          −
        </button>

        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          value={isFocused ? localText : (value !== null && value !== undefined ? String(value) : "")}
          placeholder={resolvedPlaceholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleInputChange}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-center text-lg font-semibold tabular-nums text-slate-900 outline-none dark:text-white placeholder:text-slate-400/70 dark:placeholder:text-slate-500/70 placeholder:font-normal placeholder:text-base focus:placeholder-transparent transition"
        />

        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={handleIncrement}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white transition hover:brightness-110"
          style={{ background: accent }}
        >
          +
        </button>
      </div>

      {unit ? (
        <p className="mt-0.5 text-center text-[10px] text-slate-400 dark:text-slate-500">{unit}</p>
      ) : null}
    </div>
  );
}

/** Segmented choice. Nothing is selected until the therapist selects it. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  columns = 0,
}: {
  options: { value: T; label: string; detail?: string; hue?: string; icon?: ReactNode }[];
  value: T | null;
  onChange: (next: T) => void;
  label: string;
  /** 0 lays the options out in a flowing row; a number forces a grid. */
  columns?: number;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-200">
        {label}
      </legend>

      <div
        className={columns > 0 ? "grid gap-2" : "flex flex-wrap gap-2"}
        style={columns > 0 ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {options.map((option) => {
          const active = value === option.value;
          const hue = option.hue ?? "#0891b2";

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`min-w-0 rounded-2xl border px-3 py-2.5 text-left transition ${
                active
                  ? "text-slate-900 shadow-sm dark:text-white"
                  : "border-slate-300/50 bg-white/45 text-slate-600 hover:border-slate-400/70 dark:border-white/10 dark:bg-white/4 dark:text-slate-300"
              }`}
              style={
                active
                  ? { borderColor: hue, background: `${hue}1f`, boxShadow: `0 0 0 1px ${hue}66` }
                  : undefined
              }
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                {option.icon ? <span aria-hidden style={{ color: hue }}>{option.icon}</span> : null}
                <span className="truncate">{option.label}</span>
              </span>

              {option.detail ? (
                <span className="mt-0.5 block text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                  {option.detail}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SwitchRow({
  checked,
  onChange,
  label,
  description,
  accent = "#059669",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  accent?: string;
}) {
  return (
    <div className="wfg-well flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 shrink-0 rounded-full border border-slate-300/60 transition dark:border-white/12"
        style={checked ? { background: accent, borderColor: accent } : { background: "rgb(148 163 184 / 0.25)" }}
      >
        <span
          aria-hidden
          className="absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all"
          style={{ height: 18, width: 18, left: checked ? 22 : 2 }}
        />
      </button>
    </div>
  );
}

/**
 * An anatomical region picker. Filtering an exercise library by body region
 * is faster to do by pointing than by reading a list of region names.
 */
export function BodyMap({
  selected,
  onToggle,
  counts,
}: {
  selected: string | null;
  onToggle: (region: string) => void;
  counts?: Record<string, number>;
}) {
  const regions: { id: string; label: string; shape: ReactNode }[] = [
    {
      id: "THORAX",
      label: "Thorax and lungs",
      shape: <rect x="34" y="40" width="32" height="26" rx="8" />,
    },
    {
      id: "ABDOMEN",
      label: "Abdomen and core",
      shape: <rect x="36" y="68" width="28" height="24" rx="8" />,
    },
    {
      id: "SHOULDER",
      label: "Shoulder girdle",
      shape: (
        <g>
          <circle cx="30" cy="44" r="8" />
          <circle cx="70" cy="44" r="8" />
        </g>
      ),
    },
    {
      id: "UPPER_LIMB",
      label: "Upper limb",
      shape: (
        <g>
          <rect x="18" y="52" width="10" height="34" rx="5" />
          <rect x="72" y="52" width="10" height="34" rx="5" />
        </g>
      ),
    },
    {
      id: "SPINE",
      label: "Spine and trunk",
      shape: <rect x="47" y="38" width="6" height="56" rx="3" />,
    },
    {
      id: "HIP",
      label: "Hip and pelvis",
      shape: <rect x="34" y="94" width="32" height="16" rx="7" />,
    },
    {
      id: "KNEE",
      label: "Knee",
      shape: (
        <g>
          <circle cx="42" cy="140" r="8" />
          <circle cx="58" cy="140" r="8" />
        </g>
      ),
    },
    {
      id: "ANKLE",
      label: "Ankle and foot",
      shape: (
        <g>
          <rect x="36" y="176" width="12" height="12" rx="5" />
          <rect x="52" y="176" width="12" height="12" rx="5" />
        </g>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 200" className="h-56 w-28 shrink-0" role="group" aria-label="Body region filter">
        {/* Silhouette behind the interactive regions. */}
        <g className="text-[rgb(15_23_42/0.09)] dark:text-[rgb(255_255_255/0.10)]" fill="currentColor">
          <circle cx="50" cy="22" r="13" />
          <rect x="30" y="38" width="40" height="58" rx="14" />
          <rect x="34" y="94" width="32" height="18" rx="8" />
          <rect x="36" y="110" width="12" height="80" rx="6" />
          <rect x="52" y="110" width="12" height="80" rx="6" />
          <rect x="18" y="50" width="10" height="40" rx="5" />
          <rect x="72" y="50" width="10" height="40" rx="5" />
        </g>

        {regions.map((region) => {
          const active = selected === region.id;
          const count = counts?.[region.id] ?? 0;

          return (
            <g
              key={region.id}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={`${region.label}${count ? `, ${count} exercises` : ""}`}
              onClick={() => onToggle(region.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle(region.id);
                }
              }}
              className="cursor-pointer outline-none transition"
              fill={active ? "#22d3ee" : "currentColor"}
              opacity={active ? 0.95 : count > 0 ? 0.42 : 0.18}
              style={{ color: "#0891b2" }}
            >
              {region.shape}
            </g>
          );
        })}
      </svg>

      <ul className="min-w-0 flex-1 space-y-1">
        {regions.map((region) => {
          const active = selected === region.id;
          const count = counts?.[region.id] ?? 0;

          return (
            <li key={region.id}>
              <button
                type="button"
                onClick={() => onToggle(region.id)}
                aria-pressed={active}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-[11px] transition ${
                  active
                    ? "bg-cyan-500/15 font-semibold text-cyan-800 dark:text-cyan-200"
                    : "text-slate-600 hover:bg-slate-500/8 dark:text-slate-300"
                }`}
              >
                <span className="truncate">{region.label}</span>
                <span className="shrink-0 tabular-nums text-slate-400 dark:text-slate-500">
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The horizontal day-by-day track used for recovery pathways. */
export function MilestoneRail({
  items,
  activeIndex,
  onSelect,
  accent = "#22d3ee",
}: {
  items: { id: string; day: string; target: string }[];
  activeIndex: number | null;
  onSelect?: (index: number) => void;
  accent?: string;
}) {
  return (
    <ol className="relative space-y-0">
      <span
        aria-hidden
        className="absolute bottom-4 left-[11px] top-4 w-px bg-slate-900/10 dark:bg-white/10"
      />

      {items.map((item, index) => {
        const active = activeIndex === index;

        return (
          <li key={item.id} className="relative pl-9">
            <span
              aria-hidden
              className="absolute left-0 top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition"
              style={{
                background: active ? accent : "transparent",
                borderColor: active ? accent : "rgb(148 163 184 / 0.5)",
                color: active ? "#ffffff" : "rgb(148 163 184)",
              }}
            >
              {index + 1}
            </span>

            <button
              type="button"
              onClick={onSelect ? () => onSelect(index) : undefined}
              disabled={!onSelect}
              className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                onSelect ? "hover:bg-slate-500/8" : "cursor-default"
              } ${active ? "bg-cyan-500/10" : ""}`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
                {item.day}
              </span>
              <span className="mt-0.5 block text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                {item.target}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** A horizontal bar for values that have a reference maximum. */
export function MeterBar({
  label,
  value,
  max,
  accent = "#22d3ee",
  valueLabel,
}: {
  label: string;
  value: number;
  max: number;
  accent?: string;
  valueLabel?: string;
}) {
  const ratio = max > 0 ? clamp(value / max, 0, 1) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="truncate text-slate-600 dark:text-slate-300">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-white">
          {valueLabel ?? value}
        </span>
      </div>

      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-900/8 dark:bg-white/8">
        <div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${accent}, ${accent}aa)`,
            transition: "width 500ms cubic-bezier(0.16, 1, 0.3, 1)",
            width: `${ratio * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ================================================================== */
/* Form atoms                                                          */
/* ================================================================== */

export function GlassField({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>

      {children}

      {hint ? (
        <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL_CLASS =
  "w-full rounded-xl border border-slate-300/60 bg-white/60 px-3 py-2 text-xs text-slate-900 outline-none backdrop-blur transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 dark:border-white/12 dark:bg-white/5 dark:text-slate-100";

export function GlassInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${CONTROL_CLASS} ${className}`} {...rest} />;
}

export function GlassSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select className={`${CONTROL_CLASS} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function GlassTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea className={`${CONTROL_CLASS} resize-y ${className}`} {...rest} />;
}

/* ================================================================== */
/* Modal, empty and loading states                                     */
/* ================================================================== */

export function GlassModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  accent = "#0891b2",
  children,
  footer,
  width = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  accent?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className={`wfg-panel relative my-auto w-full ${width} p-6`}>
        <header className="flex items-start justify-between gap-3 border-b border-slate-900/8 pb-4 dark:border-white/8">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white"
                style={{ background: `linear-gradient(140deg, ${accent}, ${accent}aa)` }}
              >
                {icon}
              </span>
            ) : null}

            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
              {subtitle ? (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-500/10 hover:text-slate-700 dark:hover:text-slate-100"
          >
            <X size={16} />
          </button>
        </header>

        <div className="py-5">{children}</div>

        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-900/8 pt-4 dark:border-white/8">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyPrompt({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300/70 px-6 py-10 text-center dark:border-white/12">
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400 dark:text-slate-500"
      >
        {icon}
      </span>

      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      {action}
    </div>
  );
}

export function GlassSkeleton({ rows = 3, height = 56 }: { rows?: number; height?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl bg-slate-900/6 dark:bg-white/6"
          style={{ height }}
        />
      ))}
    </div>
  );
}
