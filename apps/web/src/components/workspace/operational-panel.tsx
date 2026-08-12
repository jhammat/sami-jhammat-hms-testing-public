import type {
  ReactNode,
} from "react";

export type WonFlowPanelTone =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "slate";

export interface WonFlowOperationalPanelProps {
  title: string;
  description?: string;

  icon?: ReactNode;
  status?: ReactNode;
  action?: ReactNode;

  children: ReactNode;
  footer?: ReactNode;

  tone?: WonFlowPanelTone;

  padded?: boolean;
  compact?: boolean;
}

interface PanelTonePresentation {
  border: string;
  icon: string;
  header: string;
}

const PANEL_TONES:
  Record<
    WonFlowPanelTone,
    PanelTonePresentation
  > = {
    blue: {
      border:
        "border-blue-100",
      icon:
        "bg-blue-100 text-blue-700 ring-blue-200",
      header:
        "from-blue-50/90 to-white",
    },

    violet: {
      border:
        "border-violet-100",
      icon:
        "bg-violet-100 text-violet-700 ring-violet-200",
      header:
        "from-violet-50/90 to-white",
    },

    emerald: {
      border:
        "border-emerald-100",
      icon:
        "bg-emerald-100 text-emerald-700 ring-emerald-200",
      header:
        "from-emerald-50/90 to-white",
    },

    amber: {
      border:
        "border-amber-100",
      icon:
        "bg-amber-100 text-amber-700 ring-amber-200",
      header:
        "from-amber-50/90 to-white",
    },

    rose: {
      border:
        "border-rose-100",
      icon:
        "bg-rose-100 text-rose-700 ring-rose-200",
      header:
        "from-rose-50/90 to-white",
    },

    slate: {
      border:
        "border-slate-200",
      icon:
        "bg-slate-100 text-slate-700 ring-slate-200",
      header:
        "from-slate-50 to-white",
    },
  };

export function WonFlowOperationalPanel({
  title,
  description,
  icon,
  status,
  action,
  children,
  footer,
  tone = "blue",
  padded = true,
  compact = false,
}: WonFlowOperationalPanelProps) {
  const presentation =
    PANEL_TONES[tone];

  return (
    <section
      aria-label={title}
      className={[
        "overflow-hidden",
        "rounded-3xl border",
        "bg-white shadow-sm",
        presentation.border,
      ].join(" ")}
    >
      <header
        className={[
          "flex flex-col gap-4",
          "border-b",
          "border-slate-200/70",
          "bg-gradient-to-r",
          presentation.header,
          compact
            ? "p-4"
            : "p-5",
          "sm:flex-row",
          "sm:items-start",
          "sm:justify-between",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-start gap-3.5">
          {icon !== undefined ? (
            <div
              className={[
                "flex h-10 w-10",
                "shrink-0 items-center",
                "justify-center rounded-2xl",
                "ring-1",
                presentation.icon,
              ].join(" ")}
            >
              {icon}
            </div>
          ) : null}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-950">
                {title}
              </h3>

              {status !== undefined ? (
                <div className="shrink-0">
                  {status}
                </div>
              ) : null}
            </div>

            {description !==
            undefined ? (
              <p className="mt-1 text-sm leading-5 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {action !== undefined ? (
          <div className="shrink-0">
            {action}
          </div>
        ) : null}
      </header>

      <div
        className={
          padded
            ? compact
              ? "p-4"
              : "p-5"
            : undefined
        }
      >
        {children}
      </div>

      {footer !== undefined ? (
        <footer className="border-t border-slate-200/70 bg-slate-50/70 px-5 py-3.5 text-xs text-slate-600">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}