"use client";

import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/**
 * The pieces the original phase-one set was missing.
 *
 * Every workspace that needed a tab strip, a feedback banner or a labelled
 * field had been hand-rolling one in inline styles, which is how the allied
 * portals ended up with 250-odd style literals and no two screens agreeing
 * on a corner radius. These are the shared versions.
 *
 * Colour here comes from the token layer in `app/surfaces.css`, reached
 * through a `data-wf-accent` attribute and the `wf-*` classes, rather than
 * from Tailwind colour utilities. That is deliberate and load-bearing:
 * Tailwind literals do not survive this project's dark mode. The global
 * `html.dark [class*="text-slate-900"]` rules flip text to near-white but
 * cannot flip an accent-tinted background, so a `bg-teal-50` row with a
 * `text-slate-900` name rendered white-on-pale and disappeared. Tokens
 * define both halves of every pairing in both themes, so that class of bug
 * cannot recur. Neutral layout utilities (spacing, radius, flex) stay in
 * Tailwind — only colour moved.
 */

export type PhaseOneAccent = "indigo" | "sky" | "teal" | "emerald" | "amber" | "violet";

/**
 * The workspace hero.
 *
 * Differs from `PhaseOneHero` in that it takes an accent and a slot for
 * live figures, so a portal can lead with its numbers without every screen
 * re-inventing a stats strip.
 */
export function PhaseOneWorkspaceHero({
  eyebrow,
  title,
  description,
  accent = "indigo",
  chips,
  actions,
  aside,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  accent?: PhaseOneAccent;
  chips?: { label: string; tone?: "solid" | "quiet" }[];
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section
      data-wf-accent={accent}
      className="wf-surface wf-hero relative overflow-hidden rounded-[26px] p-6 shadow-[0_24px_65px_-32px_rgba(49,46,129,0.30)] sm:p-8"
    >
      <div
        aria-hidden="true"
        className="wf-hero-ornament absolute -right-20 -top-20 h-56 w-56 rounded-full border-[34px]"
      />

      <span
        aria-hidden="true"
        className="wf-hero-rail absolute inset-x-0 top-0 h-1"
      />

      <div className="relative z-[1] flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="wf-hero-eyebrow text-[11px] font-semibold uppercase tracking-[0.18em]">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="wf-hero-title mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
            {title}
          </h1>

          {description ? (
            <p className="wf-hero-body mt-2.5 max-w-xl text-sm leading-6">{description}</p>
          ) : null}

          {chips && chips.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip.label}
                  className={[
                    "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    chip.tone === "quiet" ? "wf-chip-quiet" : "wf-chip",
                  ].join(" ")}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}

          {actions ? <div className="mt-5 flex flex-wrap gap-2.5">{actions}</div> : null}
        </div>

        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </section>
  );
}

/** A horizontal tab strip. Real buttons, real `aria-selected`. */
export function PhaseOneTabs<T extends string>({
  tabs,
  active,
  onChange,
  accent = "indigo",
  label = "Sections",
}: {
  tabs: { id: T; label: string; icon?: ReactNode; count?: number }[];
  active: T;
  onChange: (id: T) => void;
  accent?: PhaseOneAccent;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      data-wf-accent={accent}
      className="wf-surface wf-tabs inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className="wf-tab inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          >
            {tab.icon ? <span aria-hidden="true">{tab.icon}</span> : null}

            {tab.label}

            {typeof tab.count === "number" ? (
              <span className="wf-tab-count rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The feedback banner.
 *
 * Status colour never travels alone: every tone ships a glyph and a word,
 * because two of the four status steps sit under 3:1 on a white surface
 * and a reader who cannot separate amber from orange still has to be able
 * to tell "saved" from "failed".
 */
export function PhaseOneNotice({
  tone,
  title,
  description,
  onDismiss,
}: {
  tone: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  onDismiss?: () => void;
}) {
  const glyph = { success: "✓", error: "!", warning: "!", info: "i" }[tone];
  const badge = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    warning: "bg-amber-600",
    info: "bg-blue-600",
  }[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`wf-surface wf-notice-${tone} flex items-start gap-3 rounded-2xl px-4 py-3`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${badge}`}
      >
        {glyph}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>

        {description ? (
          <p className="mt-0.5 text-xs leading-5 opacity-80">{description}</p>
        ) : null}
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 rounded-lg p-1 opacity-60 transition hover:opacity-100"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

/**
 * A prerequisite hint.
 *
 * Deliberately not a `PhaseOneNotice`. A notice reports an outcome after the
 * fact — saved, failed, rejected. This appears BEFORE anyone has done
 * anything wrong, and says what has to be true for the thing they are about
 * to attempt to work: "this patient needs an active care plan before meals
 * can reach their phone". It is quiet on purpose; a screen full of loud
 * warnings teaches people to ignore them.
 *
 * Use it where an action has a real dependency the person cannot see, and
 * where discovering it through a failed save would waste their work.
 */
export function PhaseOneGuidance({
  title,
  children,
  accent = "indigo",
  icon,
  action,
}: {
  title: string;
  children?: ReactNode;
  accent?: PhaseOneAccent;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      data-wf-accent={accent}
      className="wf-surface wf-guidance flex items-start gap-3 rounded-2xl px-4 py-3"
    >
      <span
        aria-hidden="true"
        className="wf-guidance-icon mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
      >
        {icon ?? "i"}
      </span>

      <div className="min-w-0 flex-1">
        <p className="wf-guidance-title text-xs font-semibold">{title}</p>

        {children ? (
          <div className="mt-0.5 text-[11px] leading-5">{children}</div>
        ) : null}

        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}

/**
 * The inline version, for sitting directly under a control.
 *
 * `PhaseOneField` already has a `hint`, but that is for describing the
 * field. This is for a condition attached to the control's effect — the
 * difference between "negative for weight lost" and "this only reaches the
 * patient once they have a care plan".
 */
export function PhaseOneInlineHint({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "caution";
}) {
  return (
    <p
      className={[
        "mt-1.5 flex items-start gap-1.5 text-[11px] leading-4",
        tone === "caution" ? "text-amber-700 dark:text-amber-300" : "wf-ink-3",
      ].join(" ")}
    >
      <span aria-hidden="true">{tone === "caution" ? "!" : "i"}</span>
      <span>{children}</span>
    </p>
  );
}

/** A labelled field. The label is a real `<label>`, wired by id. */
export function PhaseOneField({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="wf-surface flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="wf-label text-[11px] font-semibold uppercase tracking-[0.08em]"
      >
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>

      {children}

      {error ? (
        <p className="text-[11px] font-medium text-red-500">{error}</p>
      ) : hint ? (
        <p className="wf-ink-3 text-[11px] leading-4">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL_CLASS =
  "wf-surface wf-input min-h-11 w-full rounded-xl px-3.5 py-2 text-sm outline-none transition";

export function PhaseOneInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${CONTROL_CLASS} ${className}`} />;
}

export function PhaseOneTextarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${CONTROL_CLASS} min-h-28 resize-y leading-6 ${className}`}
    />
  );
}

export function PhaseOneSelect({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${CONTROL_CLASS} ${className}`} />;
}

/**
 * A 0–10 clinical slider with its value shown as a figure.
 *
 * Pain and mobility are scored on the phone by a caregiver as often as by
 * a clinician, so the track is a full 44px tall hit area even though the
 * visible rail is thin.
 *
 * Deliberately takes no accent: the thumb is coloured by clinical
 * SEVERITY, from the reserved status palette. Tinting it with the screen's
 * brand accent would paint a severe pain score teal on the physiotherapy
 * page and amber on the nutrition page, which is exactly the "status
 * colour used as decoration" mistake the palette forbids.
 */
export function PhaseOneScoreSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  lowLabel,
  highLabel,
  /** Set when a high score is the bad outcome, e.g. pain. */
  higherIsWorse = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
  higherIsWorse?: boolean;
}) {
  const id = useId();
  const share = max > min ? (value - min) / (max - min) : 0;

  const severity = higherIsWorse ? share : 1 - share;
  const tone =
    severity >= 0.7
      ? "var(--viz-critical)"
      : severity >= 0.4
        ? "var(--viz-warning)"
        : "var(--viz-good)";

  return (
    <div className="wf-viz wf-surface wf-panel rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="wf-ink-2 text-xs font-semibold">
          {label}
        </label>

        <span className="wf-ink text-xl font-semibold leading-none tracking-[-0.02em]">
          {value}
          <span className="wf-ink-3 ml-0.5 text-[11px] font-normal">/{max}</span>
        </span>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        // No `appearance-none` here. Stripping the native appearance also
        // strips the track, which left the control rendering as a bare
        // floating dot with nothing to drag along. The native range is
        // already accessible and keyboard-operable; `accent-color` is
        // enough to tint it, and the vertical padding gives the 44px touch
        // target a caregiver needs on a phone without touching the track.
        className="mt-3 w-full cursor-pointer py-3.5"
        style={{ accentColor: tone }}
        aria-valuetext={`${value} out of ${max}`}
      />

      <div className="wf-ink-3 -mt-1 flex justify-between text-[10px]">
        <span>
          {min}
          {lowLabel ? ` · ${lowLabel}` : ""}
        </span>

        <span>
          {max}
          {highLabel ? ` · ${highLabel}` : ""}
        </span>
      </div>
    </div>
  );
}

/** The empty state. Always says what would put something here. */
export function PhaseOneEmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="wf-surface wf-empty flex flex-col items-center justify-center gap-2 rounded-2xl px-6 py-12 text-center">
      {icon ? (
        <span className="wf-panel wf-ink-3 flex h-11 w-11 items-center justify-center rounded-2xl">
          {icon}
        </span>
      ) : null}

      <p className="wf-ink mt-1 text-sm font-semibold">{title}</p>

      {description ? (
        <p className="wf-ink-2 max-w-[42ch] text-xs leading-5">{description}</p>
      ) : null}

      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** A selectable row — referral inboxes, patient lists, task lists. */
export function PhaseOneSelectableRow({
  selected = false,
  onSelect,
  accent = "indigo",
  children,
}: {
  selected?: boolean;
  onSelect?: () => void;
  accent?: PhaseOneAccent;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      data-wf-accent={accent}
      className="wf-surface wf-row w-full rounded-2xl px-4 py-3.5 text-left transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
    >
      {children}
    </button>
  );
}

/** A solid button in the screen's accent, for the primary action. */
export function PhaseOneAccentButton({
  accent = "indigo",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { accent?: PhaseOneAccent }) {
  return (
    <button
      {...props}
      data-wf-accent={accent}
      className={[
        "wf-surface wf-btn-accent inline-flex min-h-10 items-center justify-center gap-1.5",
        "whitespace-nowrap rounded-xl px-3.5 text-xs font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
    />
  );
}

export function PhaseOneQuietButton({
  accent = "indigo",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { accent?: PhaseOneAccent }) {
  return (
    <button
      {...props}
      data-wf-accent={accent}
      className={[
        "wf-surface wf-btn-quiet inline-flex min-h-10 items-center justify-center gap-1.5",
        "whitespace-nowrap rounded-xl px-3.5 text-xs font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
    />
  );
}

/** The loading placeholder, shaped like the thing it stands in for. */
export function PhaseOneSkeleton({
  rows = 3,
  height = 84,
}: {
  rows?: number;
  height?: number;
}) {
  return (
    <div className="wf-surface flex flex-col gap-2.5" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="wf-well animate-pulse rounded-2xl"
          style={{ height }}
        />
      ))}
    </div>
  );
}
