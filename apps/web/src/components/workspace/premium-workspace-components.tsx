import Link from "next/link";

import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

export type WonFlowWorkspaceTone =
  | "blue"
  | "violet"
  | "cyan"
  | "emerald"
  | "amber"
  | "rose"
  | "slate";

const toneStyles: Record<
  WonFlowWorkspaceTone,
  {
    accent: string;
    glow: string;
    icon: string;
    soft: string;
    text: string;
  }
> = {
  blue: {
    accent: "bg-blue-600",
    glow: "from-blue-500/22 via-cyan-400/10 to-transparent",
    icon:
      "border-blue-200/70 bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-[0_8px_22px_rgba(37,99,235,0.24)]",
    soft:
      "border-blue-200/70 bg-gradient-to-br from-white via-blue-50/55 to-cyan-50/70",
    text: "text-blue-700",
  },

  violet: {
    accent: "bg-violet-600",
    glow: "from-violet-500/22 via-fuchsia-400/10 to-transparent",
    icon:
      "border-violet-200/70 bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-[0_8px_22px_rgba(124,58,237,0.22)]",
    soft:
      "border-violet-200/70 bg-gradient-to-br from-white via-violet-50/55 to-fuchsia-50/65",
    text: "text-violet-700",
  },

  cyan: {
    accent: "bg-cyan-600",
    glow: "from-cyan-500/22 via-sky-400/10 to-transparent",
    icon:
      "border-cyan-200/70 bg-gradient-to-br from-cyan-500 to-sky-500 text-white shadow-[0_8px_22px_rgba(8,145,178,0.22)]",
    soft:
      "border-cyan-200/70 bg-gradient-to-br from-white via-cyan-50/55 to-sky-50/70",
    text: "text-cyan-700",
  },

  emerald: {
    accent: "bg-emerald-600",
    glow: "from-emerald-500/22 via-teal-400/10 to-transparent",
    icon:
      "border-emerald-200/70 bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-[0_8px_22px_rgba(5,150,105,0.22)]",
    soft:
      "border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/55 to-teal-50/70",
    text: "text-emerald-700",
  },

  amber: {
    accent: "bg-amber-500",
    glow: "from-amber-400/24 via-orange-400/10 to-transparent",
    icon:
      "border-amber-200/70 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_8px_22px_rgba(245,158,11,0.24)]",
    soft:
      "border-amber-200/70 bg-gradient-to-br from-white via-amber-50/55 to-orange-50/70",
    text: "text-amber-700",
  },

  rose: {
    accent: "bg-rose-600",
    glow: "from-rose-500/22 via-pink-400/10 to-transparent",
    icon:
      "border-rose-200/70 bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-[0_8px_22px_rgba(225,29,72,0.22)]",
    soft:
      "border-rose-200/70 bg-gradient-to-br from-white via-rose-50/55 to-pink-50/70",
    text: "text-rose-700",
  },

  slate: {
    accent: "bg-slate-500",
    glow: "from-slate-400/18 via-blue-300/8 to-transparent",
    icon:
      "border-slate-300/70 bg-gradient-to-br from-slate-700 to-slate-500 text-white shadow-[0_8px_22px_rgba(51,65,85,0.18)]",
    soft:
      "border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/45",
    text: "text-slate-600",
  },
};

export interface WonFlowBreadcrumb {
  label: string;
  href?: string;
}

interface WonFlowPageHeaderProps {
  title: string;

  description?: string;
  eyebrow?: string;

  breadcrumbs?:
    readonly WonFlowBreadcrumb[];

  leading?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
}

export function WonFlowPageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  leading,
  metadata,
  actions,
}: WonFlowPageHeaderProps) {
  return (
    <header className="wf-page-header relative isolate overflow-hidden rounded-[24px] border border-white/80 dark:border-slate-800 bg-gradient-to-br from-white via-indigo-50/45 to-cyan-50/70 dark:from-slate-900 dark:via-slate-800/90 dark:to-slate-900 shadow-[0_18px_50px_rgba(37,99,235,0.10)] dark:shadow-none ring-1 ring-indigo-100/70 dark:ring-slate-800">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-400/15 dark:bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-52 w-52 rounded-full bg-cyan-400/15 dark:bg-cyan-500/10 blur-3xl" />
      <div
        aria-hidden="true"
        suppressHydrationWarning
        className="pointer-events-none absolute inset-0 opacity-[0.20] [background-image:radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.28)_1px,transparent_0)] dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:18px_18px]"
      />

      <div className="relative px-4 py-4 sm:px-5 lg:px-6">
        {breadcrumbs !==
        undefined ? (
          <nav
            aria-label="Breadcrumb"
            className="mb-2.5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500"
          >
            {breadcrumbs.map(
              (
                breadcrumb,
                index,
              ) => (
                <span
                  className="flex items-center gap-2"
                  key={`${breadcrumb.label}-${index}`}
                >
                  {breadcrumb.href !==
                  undefined ? (
                    <Link
                      className="transition hover:text-blue-700 dark:hover:text-blue-400 text-slate-500 dark:text-slate-400"
                      href={
                        breadcrumb.href
                      }
                    >
                      {
                        breadcrumb.label
                      }
                    </Link>
                  ) : (
                    <span className="text-slate-700 dark:text-slate-300">
                      {
                        breadcrumb.label
                      }
                    </span>
                  )}

                  {index <
                  breadcrumbs.length -
                    1 ? (
                    <span
                      aria-hidden="true"
                      className="text-slate-300 dark:text-slate-600"
                    >
                      /
                    </span>
                  ) : null}
                </span>
              ),
            )}
          </nav>
        ) : null}

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            {leading !==
            undefined ? (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-white/80 dark:border-indigo-500/30 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-[0_10px_28px_rgba(79,70,229,0.28)] ring-1 ring-indigo-200 dark:ring-indigo-800">
                {leading}
              </div>
            ) : null}

            <div className="min-w-0">
              {eyebrow !==
              undefined ? (
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                  {eyebrow}
                </div>
              ) : null}

              <h1
                className={[
                  eyebrow !==
                  undefined
                    ? "mt-1"
                    : "",
                  "text-2xl font-black",
                  "tracking-[-0.04em]",
                  "text-slate-950 dark:text-white",
                  "sm:text-[27px]",
                  "sm:leading-tight",
                ].join(" ")}
              >
                {title}
              </h1>

              {description !==
              undefined ? (
                <p className="mt-1.5 max-w-4xl text-sm leading-5 text-slate-600 dark:text-slate-300">
                  {description}
                </p>
              ) : null}

              {metadata !==
              undefined ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {metadata}
                </div>
              ) : null}
            </div>
          </div>

          {actions !==
          undefined ? (
            <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-[46%] xl:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

interface WonFlowKpiTrend {
  direction: string;
  value: string;
  label?: string;
}

interface WonFlowKpiCardProps {
  label: string;

  value: ReactNode;

  helperText?: string;
  icon?: ReactNode;

  trend?: WonFlowKpiTrend;

  tone?: WonFlowWorkspaceTone;
}

export function WonFlowKpiCard({
  label,
  value,
  helperText,
  icon,
  trend,
  tone = "blue",
}: WonFlowKpiCardProps) {
  const style =
    toneStyles[tone];

  return (
    <article className={["group relative isolate min-w-0 overflow-hidden rounded-[20px] border p-4 shadow-[0_10px_30px_rgba(15,23,42,0.055)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(37,99,235,0.13)]", style.soft].join(" ")}>
      <div
        className={[
          "pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-gradient-to-br blur-2xl transition duration-300 group-hover:scale-125",
          style.glow,
        ].join(" ")}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
            {label}
          </div>

          <div className="mt-2 truncate text-2xl font-black tracking-[-0.04em] text-slate-950">
            {value}
          </div>
        </div>

        {icon !==
        undefined ? (
          <div
            className={[
              "relative flex h-10 w-10",
              "shrink-0 items-center",
              "justify-center rounded-[14px]",
              "border",
              style.icon,
            ].join(" ")}
          >
            {icon}
          </div>
        ) : null}
      </div>

      {helperText !==
      undefined ||
      trend !==
      undefined ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          {trend !==
          undefined ? (
            <span
              className={[
                "inline-flex items-center",
                "rounded-full px-2 py-1",
                "text-[10px] font-black",
                trend.direction === "down"
                  ? "bg-rose-50 text-rose-700"
                  : trend.direction === "up"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600",
              ].join(" ")}
            >
              {trend.direction === "up"
                ? "↑ "
                : trend.direction === "down"
                  ? "↓ "
                  : ""}
              {trend.value}
            </span>
          ) : null}

          {trend?.label !==
          undefined ? (
            <span className="text-[11px] text-slate-500">
              {trend.label}
            </span>
          ) : helperText !==
            undefined ? (
            <span className="line-clamp-2 text-[11px] leading-5 text-slate-500">
              {helperText}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

interface WonFlowOperationalPanelProps {
  title: string;

  description?: string;

  icon?: ReactNode;
  status?: ReactNode;

  action?: ReactNode;
  footer?: ReactNode;

  tone?: WonFlowWorkspaceTone;

  compact?: boolean;

  children: ReactNode;
}

export function WonFlowOperationalPanel({
  title,
  description,
  icon,
  status,
  action,
  footer,
  tone = "blue",
  compact = false,
  children,
}: WonFlowOperationalPanelProps) {
  const style =
    toneStyles[tone];

  return (
    <section className="wf-operational-panel min-w-0 overflow-hidden rounded-[22px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900 shadow-[0_12px_36px_rgba(15,23,42,0.06)] dark:shadow-none ring-1 ring-white/60 dark:ring-slate-850">
      <header
        className={[
          "wf-operational-panel-header",
          "flex flex-col gap-4",
          "bg-gradient-to-r from-slate-50 via-white to-indigo-50/55 dark:from-slate-900 dark:via-slate-850/80 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800",
          "sm:flex-row",
          "sm:items-center",
          "sm:justify-between",
          compact
            ? "px-4 py-3.5"
            : "px-5 py-4 sm:px-6",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-start gap-3">
          {icon !==
          undefined ? (
            <div
              className={[
                "flex h-10 w-10",
                "shrink-0 items-center",
                "justify-center",
                "rounded-xl border",
                style.icon,
              ].join(" ")}
            >
              {icon}
            </div>
          ) : (
            <span className={["mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-lg", style.accent].join(" ")}>
              <span className="h-2.5 w-2.5 rounded-full bg-white ring-4 ring-white/25" />
            </span>
          )}

          <div className="min-w-0">
            <h2 className="text-base font-black tracking-[-0.025em] text-slate-950 dark:text-white">
              {title}
            </h2>

            {description !==
            undefined ? (
              <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {status !==
          undefined ||
        action !==
          undefined ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {status}
            {action}
          </div>
        ) : null}
      </header>

      <div
        className={
          compact
            ? "min-w-0 p-4"
            : "min-w-0 p-5 sm:p-6"
        }
      >
        {children}
      </div>

      {footer !==
      undefined ? (
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-5 py-3.5 text-xs leading-5 text-slate-500 dark:text-slate-400 sm:px-6">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

interface WonFlowActionBarProps {
  title: string;

  description?: string;

  summary?: ReactNode;

  filters?: ReactNode;

  primaryActions?: ReactNode;
  secondaryActions?: ReactNode;
}

export function WonFlowActionBar({
  title,
  description,
  summary,
  filters,
  primaryActions,
  secondaryActions,
}: WonFlowActionBarProps) {
  return (
    <section className="relative min-w-0 overflow-hidden rounded-[20px] border border-indigo-100/80 dark:border-slate-800 bg-gradient-to-r from-white via-slate-50/60 to-indigo-50/70 dark:from-slate-900 dark:via-slate-850/60 dark:to-slate-900 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.055)] dark:shadow-none">
      <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-blue-400/10 dark:bg-blue-500/5 blur-2xl" />
      <div className="relative flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-black tracking-[-0.02em] text-slate-950 dark:text-white">
              {title}
            </h2>

            {description !==
            undefined ? (
              <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>

          {summary !==
          undefined ? (
            <div className="shrink-0 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-300">
              {summary}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
          {filters !==
          undefined ? (
            <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
              {filters}
            </div>
          ) : null}

          {secondaryActions !==
          undefined ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {secondaryActions}
            </div>
          ) : null}

          {primaryActions !==
          undefined ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {primaryActions}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export type WonFlowActionButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

interface WonFlowActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;

  variant?:
    WonFlowActionButtonVariant;
}

const actionButtonStyles:
  Record<
    WonFlowActionButtonVariant,
    string
  > = {
  primary: [
    "border-blue-600",
    "bg-blue-600",
    "text-white",
    "shadow-[0_6px_15px_rgba(37,99,235,0.18)]",
    "hover:border-blue-700",
    "hover:bg-blue-700",
  ].join(" "),

  secondary: [
    "border-slate-300 dark:border-slate-700",
    "bg-white dark:bg-slate-800",
    "text-slate-700 dark:text-slate-200",
    "hover:border-blue-200 dark:hover:border-blue-500",
    "hover:bg-blue-50 dark:hover:bg-slate-700",
    "hover:text-blue-700 dark:hover:text-blue-300",
  ].join(" "),

  ghost: [
    "border-slate-200 dark:border-slate-700",
    "bg-slate-50 dark:bg-slate-800/60",
    "text-slate-600 dark:text-slate-300",
    "hover:border-slate-300 dark:hover:border-slate-600",
    "hover:bg-white dark:hover:bg-slate-700",
    "hover:text-slate-950 dark:hover:text-white",
  ].join(" "),

  danger: [
    "border-rose-200 dark:border-rose-900",
    "bg-rose-50 dark:bg-rose-950/50",
    "text-rose-700 dark:text-rose-300",
    "hover:border-rose-300 dark:hover:border-rose-800",
    "hover:bg-rose-100 dark:hover:bg-rose-900/60",
  ].join(" "),
};

export function WonFlowActionButton({
  icon,
  variant = "secondary",
  className = "",
  children,
  type = "button",
  ...buttonProps
}: WonFlowActionButtonProps) {
  return (
    <button
      className={[
        "inline-flex min-h-10",
        "items-center justify-center",
        "gap-2 rounded-xl border",
        "px-3.5 py-2",
        "text-sm font-bold",
        "transition",
        "focus-visible:outline-none",
        "focus-visible:ring-4",
        "focus-visible:ring-blue-100",
        "disabled:cursor-not-allowed",
        "disabled:opacity-50",
        actionButtonStyles[
          variant
        ],
        className,
      ].join(" ")}
      type={type}
      {...buttonProps}
    >
      {icon !==
      undefined ? (
        <span className="shrink-0">
          {icon}
        </span>
      ) : null}

      {children}
    </button>
  );
}
