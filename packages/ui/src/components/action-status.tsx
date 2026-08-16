import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCw,
  ShieldAlert,
} from "lucide-react";

import { cn } from "../lib/utils";
import { Button, buttonVariants } from "./button";

/**
 * The four pieces that make "why can this not start?" visible instead of a
 * silent failure: ActionReadiness (blockers before an action), ActionResult
 * (what happened after it), StatusBadge (current server state, always),
 * and PrerequisiteCard (an empty screen caused by missing setup, not by
 * there being nothing to show yet).
 */

// ---------------------------------------------------------------------------
// ActionReadiness
// ---------------------------------------------------------------------------

export interface ActionReadinessBlocker {
  /** Stable identifier for the cause — lets a caller special-case one blocker without string-matching the reason text. */
  code: string;
  /** Plain-English statement of what is wrong and the exact fix. Never "X is required" alone. */
  reason: string;
  /** Who resolves it, e.g. "Administrator", "Reception", "You". */
  resolverLabel: string;
  /** The screen that resolves it, when there is one to link to. */
  resolutionHref?: string;
  resolutionLabel?: string;
}

export interface ActionReadinessProps {
  blockers: readonly ActionReadinessBlocker[];
  className?: string;
}

/**
 * Shown above any action that has prerequisites. Renders nothing when
 * `blockers` is empty — a screen calls this unconditionally with whatever
 * the readiness endpoint returned, rather than deciding for itself whether
 * to show it.
 */
export function ActionReadiness({ blockers, className }: ActionReadinessProps) {
  if (blockers.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--amber-600)]/30 bg-[var(--amber-600)]/5 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="mt-0.5 size-4.5 shrink-0 text-[var(--amber-600)]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--ink-900)]">
            {blockers.length === 1 ? "This cannot start yet" : `This cannot start yet — ${blockers.length} things to resolve`}
          </h3>
          <ul className="mt-2 space-y-2.5">
            {blockers.map((blocker) => (
              <li className="text-sm text-[var(--ink-700)]" key={blocker.code}>
                <p>{blocker.reason}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--ink-500)]">
                  <span>{blocker.resolverLabel} can fix this.</span>
                  {blocker.resolutionHref ? (
                    <a
                      className="inline-flex items-center gap-0.5 font-medium text-[var(--blue-600)] underline underline-offset-2"
                      href={blocker.resolutionHref}
                    >
                      {blocker.resolutionLabel ?? "Go there"}
                      <ArrowRight className="size-3" />
                    </a>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionResult
// ---------------------------------------------------------------------------

export type ActionResultState =
  | { status: "idle" }
  | { status: "pending"; message?: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string; onRetry?: () => void };

export interface ActionResultProps {
  result: ActionResultState;
  className?: string;
}

/**
 * Replaces ad-hoc `setMessage(...)` strings. The only way this can show
 * "success" is a caller passing `{ status: "success" }` — construct that
 * from the server's own confirmation, never optimistically ahead of it.
 * "pending" renders synchronously, so it never misses the 200ms budget for
 * a loading state to appear.
 */
export function ActionResult({ result, className }: ActionResultProps) {
  if (result.status === "idle") {
    return null;
  }

  if (result.status === "pending") {
    return (
      <p
        role="status"
        className={cn("inline-flex items-center gap-1.5 text-sm text-[var(--ink-500)]", className)}
      >
        <Loader2 className="size-4 animate-spin" />
        {result.message ?? "Working…"}
      </p>
    );
  }

  if (result.status === "success") {
    return (
      <p
        role="status"
        className={cn("inline-flex items-center gap-1.5 text-sm text-[var(--green-600)]", className)}
      >
        <CheckCircle2 className="size-4" />
        {result.message}
      </p>
    );
  }

  return (
    <p
      role="alert"
      className={cn("inline-flex flex-wrap items-center gap-1.5 text-sm text-[var(--red-600)]", className)}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span>{result.message}</span>
      {result.onRetry ? (
        <Button onClick={result.onRetry} size="sm" variant="outline">
          <RotateCw className="size-3.5" />
          Retry
        </Button>
      ) : null}
    </p>
  );
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

export type StatusBadgeTone = "neutral" | "positive" | "caution" | "critical" | "info";

const STATUS_BADGE_TONE_CLASS: Record<StatusBadgeTone, string> = {
  neutral: "bg-[var(--muted)] text-[var(--ink-700)]",
  positive: "bg-[var(--green-600)]/10 text-[var(--green-600)]",
  caution: "bg-[var(--amber-600)]/10 text-[var(--amber-600)]",
  critical: "bg-[var(--red-600)]/10 text-[var(--red-600)]",
  info: "bg-[var(--blue-600)]/10 text-[var(--blue-600)]",
};

export interface StatusBadgeProps {
  /** No default — there is deliberately no way to render this without a value the caller sourced from the server, so a badge can never quietly fall back to a locally-assumed state. */
  label: string;
  tone: StatusBadgeTone;
  className?: string;
}

/**
 * A status pill with one rule: this component holds no state of its own
 * and assumes nothing when a prop is absent. `label` and `tone` are both
 * required — a screen that has not yet fetched real status has nothing
 * valid to pass here, so it renders a loading state instead of this badge,
 * rather than this badge guessing. That is what makes it impossible for
 * the badge and an accompanying message to disagree: both must be built
 * from the same server response.
 */
export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        STATUS_BADGE_TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// PrerequisiteCard
// ---------------------------------------------------------------------------

export interface PrerequisiteCardProps {
  title: string;
  description: string;
  resolverLabel: string;
  resolutionHref: string;
  resolutionLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Replaces a blank page. A screen with real prerequisites (no branch
 * assigned, no schedule published, no service catalogue) is not "empty
 * data" — DataEmpty says "nothing here yet, add one"; this says "here is
 * exactly what is missing and who sets it up."
 */
export function PrerequisiteCard({
  title,
  description,
  resolverLabel,
  resolutionHref,
  resolutionLabel = "Set this up",
  icon,
  className,
}: PrerequisiteCardProps) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--line-2)] border-dashed p-8 text-center",
        className,
      )}
    >
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--ink-500)]">
        {icon ?? <ShieldAlert className="size-5" />}
      </div>

      <h3 className="mt-3 text-base font-semibold text-[var(--ink-900)]">{title}</h3>

      <p className="mx-auto mt-1 max-w-lg text-sm text-[var(--ink-500)]">{description}</p>

      <p className="mt-1 text-xs text-[var(--ink-500)]">{resolverLabel} can set this up.</p>

      <div className="mt-4">
        <a className={cn(buttonVariants({ variant: "primary" }))} href={resolutionHref}>
          {resolutionLabel}
        </a>
      </div>
    </div>
  );
}
