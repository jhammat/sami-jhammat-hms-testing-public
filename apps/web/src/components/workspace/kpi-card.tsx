import type {
  ReactNode,
} from "react";

export type WonFlowKpiTone =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "slate";

export type WonFlowKpiTrendDirection =
  | "up"
  | "down"
  | "neutral";

export interface WonFlowKpiTrend {
  direction:
    WonFlowKpiTrendDirection;

  value: string;
  label?: string;
}

export interface WonFlowKpiCardProps {
  label: string;
  value: ReactNode;

  helperText?: string;

  icon?: ReactNode;
  trend?: WonFlowKpiTrend;

  tone?: WonFlowKpiTone;

  footer?: ReactNode;

  loading?: boolean;
}

interface TonePresentation {
  card: string;
  icon: string;
  accent: string;
}

const TONE_PRESENTATIONS:
  Record<
    WonFlowKpiTone,
    TonePresentation
  > = {
    blue: {
      card:
        "border-blue-100 bg-gradient-to-br from-white to-blue-50/80",
      icon:
        "bg-blue-100 text-blue-700 ring-blue-200",
      accent:
        "bg-blue-500",
    },

    violet: {
      card:
        "border-violet-100 bg-gradient-to-br from-white to-violet-50/80",
      icon:
        "bg-violet-100 text-violet-700 ring-violet-200",
      accent:
        "bg-violet-500",
    },

    emerald: {
      card:
        "border-emerald-100 bg-gradient-to-br from-white to-emerald-50/80",
      icon:
        "bg-emerald-100 text-emerald-700 ring-emerald-200",
      accent:
        "bg-emerald-500",
    },

    amber: {
      card:
        "border-amber-100 bg-gradient-to-br from-white to-amber-50/80",
      icon:
        "bg-amber-100 text-amber-700 ring-amber-200",
      accent:
        "bg-amber-500",
    },

    rose: {
      card:
        "border-rose-100 bg-gradient-to-br from-white to-rose-50/80",
      icon:
        "bg-rose-100 text-rose-700 ring-rose-200",
      accent:
        "bg-rose-500",
    },

    slate: {
      card:
        "border-slate-200 bg-gradient-to-br from-white to-slate-50",
      icon:
        "bg-slate-100 text-slate-700 ring-slate-200",
      accent:
        "bg-slate-500",
    },
  };

function getTrendPresentation(
  direction:
    WonFlowKpiTrendDirection,
): {
  symbol: string;
  className: string;
} {
  switch (direction) {
    case "up":
      return {
        symbol: "↑",
        className:
          "bg-emerald-50 text-emerald-700 ring-emerald-100",
      };

    case "down":
      return {
        symbol: "↓",
        className:
          "bg-rose-50 text-rose-700 ring-rose-100",
      };

    case "neutral":
      return {
        symbol: "•",
        className:
          "bg-slate-100 text-slate-600 ring-slate-200",
      };
  }
}

export function WonFlowKpiCard({
  label,
  value,
  helperText,
  icon,
  trend,
  tone = "blue",
  footer,
  loading = false,
}: WonFlowKpiCardProps) {
  const presentation =
    TONE_PRESENTATIONS[tone];

  const trendPresentation =
    trend === undefined
      ? undefined
      : getTrendPresentation(
          trend.direction,
        );

  return (
    <section
      aria-busy={loading}
      aria-label={label}
      className={[
        "relative overflow-hidden",
        "rounded-3xl border",
        "p-5 shadow-sm",
        "transition",
        "hover:-translate-y-0.5",
        "hover:shadow-md",
        presentation.card,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "absolute inset-x-0 top-0",
          "h-1",
          presentation.accent,
        ].join(" ")}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-600">
            {label}
          </p>

          {loading ? (
            <div
              aria-hidden="true"
              className="mt-3 h-9 w-28 animate-pulse rounded-xl bg-slate-200/80"
            />
          ) : (
            <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {value}
            </div>
          )}

          {loading ? (
            <div
              aria-hidden="true"
              className="mt-3 h-3 w-36 animate-pulse rounded-full bg-slate-100"
            />
          ) : helperText !==
            undefined ? (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {helperText}
            </p>
          ) : null}
        </div>

        {icon !== undefined ? (
          <div
            className={[
              "flex h-11 w-11",
              "shrink-0 items-center",
              "justify-center rounded-2xl",
              "ring-1",
              presentation.icon,
            ].join(" ")}
          >
            {icon}
          </div>
        ) : null}
      </div>

      {!loading &&
      trend !== undefined &&
      trendPresentation !==
        undefined ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={[
              "inline-flex items-center",
              "gap-1 rounded-full",
              "px-2.5 py-1",
              "text-xs font-bold",
              "ring-1",
              trendPresentation.className,
            ].join(" ")}
          >
            <span aria-hidden="true">
              {trendPresentation.symbol}
            </span>

            {trend.value}
          </span>

          {trend.label !== undefined ? (
            <span className="text-xs text-slate-500">
              {trend.label}
            </span>
          ) : null}
        </div>
      ) : null}

      {!loading &&
      footer !== undefined ? (
        <div className="mt-4 border-t border-slate-200/70 pt-4 text-xs text-slate-600">
          {footer}
        </div>
      ) : null}
    </section>
  );
}