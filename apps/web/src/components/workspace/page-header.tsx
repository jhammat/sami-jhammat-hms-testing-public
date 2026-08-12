import type {
  ReactNode,
} from "react";

/**
 * @deprecated Breadcrumbs are no longer rendered here — the unified
 * WonFlow shell header already shows the current page's place in the
 * portal. Kept only so existing callers passing `breadcrumbs` still
 * type-check while they're migrated off it.
 */
export interface WonFlowBreadcrumbItem {
  label: string;
  href?: string;
}

export interface WonFlowPageHeaderProps {
  title: string;
  description?: string;

  eyebrow?: string;
  leading?: ReactNode;

  breadcrumbs?:
    readonly WonFlowBreadcrumbItem[];

  actions?: ReactNode;
  metadata?: ReactNode;

  compact?: boolean;
}

export function WonFlowPageHeader({
  title,
  description,
  eyebrow,
  leading,
  actions,
  metadata,
  compact = false,
}: WonFlowPageHeaderProps) {
  return (
    <header
      className={[
        "rounded-3xl",
        "border border-slate-200/80",
        "bg-white",
        "shadow-sm",
        compact
          ? "p-4 sm:p-5"
          : "p-5 sm:p-6 xl:p-7",
      ].join(" ")}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {leading !== undefined ? (
            <div
              className={[
                "flex h-12 w-12",
                "shrink-0 items-center",
                "justify-center rounded-2xl",
                "bg-gradient-to-br",
                "from-blue-50",
                "to-violet-100",
                "text-indigo-700",
                "ring-1 ring-indigo-100",
              ].join(" ")}
            >
              {leading}
            </div>
          ) : null}

          <div className="min-w-0">
            {eyebrow !== undefined ? (
              <div className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">
                {eyebrow}
              </div>
            ) : null}

            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h2>

            {description !== undefined ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                {description}
              </p>
            ) : null}

            {metadata !== undefined ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {metadata}
              </div>
            ) : null}
          </div>
        </div>

        {actions !== undefined ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}