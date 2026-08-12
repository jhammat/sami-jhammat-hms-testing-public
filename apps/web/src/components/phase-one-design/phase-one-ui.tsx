import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

export const phaseOneInputClassName = [
  "min-h-11 w-full rounded-xl",
  "border border-slate-200 bg-white",
  "px-3.5 text-sm text-slate-950",
  "outline-none transition",
  "placeholder:text-slate-400",
  "focus:border-blue-500",
  "focus:ring-4 focus:ring-blue-100",
  "disabled:cursor-not-allowed",
  "disabled:bg-slate-100",
  "disabled:text-slate-500",
].join(" ");

export const phaseOneTextareaClassName = [
  phaseOneInputClassName,
  "min-h-28 resize-y py-3 leading-6",
].join(" ");

export function PhaseOnePage({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      {children}
    </div>
  );
}

export function PhaseOneHero({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-indigo-100 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_34%),linear-gradient(135deg,#ffffff,#eef2ff_54%,#f5f3ff)] p-6 shadow-[0_24px_65px_rgba(49,46,129,0.10)] sm:p-8">
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-16 h-52 w-52 rounded-full border-[32px] border-white/55"
      />

      <div className="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            {title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            {description}
          </p>
        </div>

        {actions ? (
          <div className="flex flex-wrap gap-3">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function PhaseOneSectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {actions}
    </header>
  );
}

export function PhaseOnePanel({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_16px_42px_rgba(15,23,42,0.055)]">
      {title || description || actions ? (
        <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-base font-semibold text-slate-950">
                {title}
              </h2>
            ) : null}

            {description ? (
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>

          {actions}
        </header>
      ) : null}

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

export function PhaseOneMetricCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string | number;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <article className="rounded-[20px] border border-blue-100/80 bg-gradient-to-br from-white via-blue-50/35 to-violet-50/55 p-5 shadow-[0_14px_35px_rgba(37,99,235,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-slate-950">
            {value}
          </p>
        </div>

        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm ring-1 ring-blue-100">
            {icon}
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

export function PhaseOneAvatar({
  name,
  photoUrl,
  size = "medium",
}: {
  name: string;
  photoUrl?: string;
  size?: "small" | "medium" | "large";
}) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const initials =
    parts.length === 0
      ? "—"
      : parts.length === 1
        ? parts[0]!.slice(0, 2).toUpperCase()
        : `${parts[0]![0]}${parts.at(-1)![0]}`.toUpperCase();

  const sizeClassName = {
    small: "h-9 w-9 text-[10px]",
    medium: "h-12 w-12 text-xs",
    large: "h-16 w-16 text-sm",
  }[size];

  return (
    <div
      aria-label={name}
      className={[
        "flex shrink-0 items-center justify-center",
        "overflow-hidden rounded-full",
        "bg-violet-50 font-semibold text-violet-700",
        "ring-2 ring-violet-400 ring-offset-2",
        sizeClassName,
      ].join(" ")}
      role="img"
      style={
        photoUrl
          ? {
              backgroundImage: `url("${photoUrl}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {photoUrl ? (
        <span className="sr-only">
          Profile photo for {name}
        </span>
      ) : (
        initials
      )}
    </div>
  );
}

export function PhaseOneStatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?:
    | "neutral"
    | "information"
    | "success"
    | "warning"
    | "critical";
}) {
  const styles = {
    neutral:
      "bg-slate-100 text-slate-700 ring-slate-200",
    information:
      "bg-blue-50 text-blue-700 ring-blue-200",
    success:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning:
      "bg-amber-50 text-amber-800 ring-amber-200",
    critical:
      "bg-red-950 text-red-50 ring-red-900",
  }[tone];

  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1",
        "text-[11px] font-semibold ring-1",
        styles,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export function PhaseOnePrimaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-xl",
        "bg-blue-700 px-4 text-sm font-semibold text-white",
        "transition hover:bg-blue-800",
        "focus-visible:outline-none",
        "focus-visible:ring-4 focus-visible:ring-blue-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
    />
  );
}

export function PhaseOneSecondaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-xl",
        "border border-slate-200 bg-white px-4",
        "text-sm font-semibold text-slate-700",
        "transition hover:bg-slate-50",
        "focus-visible:outline-none",
        "focus-visible:ring-4 focus-visible:ring-slate-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
    />
  );
}
