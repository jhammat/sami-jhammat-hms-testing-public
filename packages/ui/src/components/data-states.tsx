import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Loader2,
  RotateCw,
} from "lucide-react";

import { cn } from "../lib/utils";
import { Button } from "./button";
import { Skeleton } from "./skeleton";

/**
 * The three states every list/detail screen must use instead of inventing
 * its own loading, empty and error markup: DataLoading, DataEmpty and
 * DataError. SaveIndicator is the matching state for a mutation in
 * progress (saving / saved / failed).
 */

export type DataLoadingShape =
  | "list"
  | "table"
  | "cards"
  | "detail";

export interface DataLoadingProps {
  /** The shape of the content this replaces, so the skeleton reads as a placeholder for it rather than a generic spinner. */
  shape?: DataLoadingShape;
  rows?: number;
  columns?: number;
  label?: string;
  className?: string;
}

export function DataLoading({
  shape = "list",
  rows = 5,
  columns = 4,
  label = "Loading",
  className,
}: DataLoadingProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("space-y-2", className)}
    >
      <span className="sr-only">{label}</span>

      {shape === "table" && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className="flex gap-3"
            >
              {Array.from({ length: columns }, (_, columnIndex) => (
                <Skeleton
                  key={columnIndex}
                  className="h-9 flex-1"
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {shape === "cards" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: rows }, (_, index) => (
            <Skeleton
              key={index}
              className="h-32 w-full"
            />
          ))}
        </div>
      )}

      {shape === "detail" && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton
                key={index}
                className="h-16 w-full"
              />
            ))}
          </div>
        </div>
      )}

      {shape === "list" &&
        Array.from({ length: rows }, (_, index) => (
          <Skeleton
            key={index}
            className="h-10 w-full"
          />
        ))}
    </div>
  );
}

export interface DataEmptyAction {
  label: string;
  onClick: () => void;
}

export interface DataEmptyProps {
  /** What would appear here, e.g. "patients", "appointments". Drives the default heading and body copy. */
  itemLabel: string;
  title?: string;
  description?: string;
  /** The action that creates the first item. Pass a config object for the default button, or a node for a custom trigger. */
  action: DataEmptyAction | React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

function isDataEmptyAction(
  action: DataEmptyAction | React.ReactNode,
): action is DataEmptyAction {
  return (
    typeof action === "object" &&
    action !== null &&
    "label" in action &&
    "onClick" in action
  );
}

export function DataEmpty({
  itemLabel,
  title,
  description,
  action,
  icon,
  className,
}: DataEmptyProps) {
  const heading = title ?? `No ${itemLabel} yet`;

  const body =
    description ??
    `${itemLabel.charAt(0).toUpperCase()}${itemLabel.slice(1)} will appear here once added.`;

  return (
    <div
      role="status"
      className={cn(
        "rounded-[var(--radius-card)] border border-dashed border-[var(--line-2)] p-8 text-center",
        className,
      )}
    >
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--ink-500)]">
        {icon ?? <Inbox className="size-5" />}
      </div>

      <h3 className="mt-3 text-base font-semibold">{heading}</h3>

      <p className="mx-auto mt-1 max-w-lg text-sm text-[var(--ink-500)]">
        {body}
      </p>

      <div className="mt-4">
        {isDataEmptyAction(action) ? (
          <Button onClick={action.onClick}>{action.label}</Button>
        ) : (
          action
        )}
      </div>
    </div>
  );
}

export interface DataErrorProps {
  /** What failed to load, e.g. "patients", "this appointment". */
  what: string;
  onRetry: () => void;
  detail?: string;
  className?: string;
}

export function DataError({
  what,
  onRetry,
  detail,
  className,
}: DataErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-8 text-center",
        className,
      )}
    >
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[var(--red-600)]/10 text-[var(--red-600)]">
        <AlertTriangle className="size-5" />
      </div>

      <h3 className="mt-3 text-base font-semibold">
        Could not load {what}
      </h3>

      {detail && (
        <p className="mx-auto mt-1 max-w-lg text-sm text-[var(--ink-500)]">
          {detail}
        </p>
      )}

      <div className="mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
        >
          <RotateCw className="size-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}

export type SaveState =
  | "idle"
  | "saving"
  | "saved"
  | "failed";

export interface SaveIndicatorProps {
  state: SaveState;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * The save lifecycle every form/inline-edit must show. On "failed" the
 * caller's form data must stay exactly as the person left it — this
 * component only reports status, it never clears anything.
 */
export function SaveIndicator({
  state,
  errorMessage,
  onRetry,
  className,
}: SaveIndicatorProps) {
  if (state === "idle") {
    return null;
  }

  if (state === "saving") {
    return (
      <span
        role="status"
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-[var(--ink-500)]",
          className,
        )}
      >
        <Loader2 className="size-3.5 animate-spin" />
        Saving…
      </span>
    );
  }

  if (state === "saved") {
    return (
      <span
        role="status"
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-[var(--green-600)]",
          className,
        )}
      >
        <CheckCircle2 className="size-3.5" />
        Saved
      </span>
    );
  }

  return (
    <span
      role="alert"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-[var(--red-600)]",
        className,
      )}
    >
      <AlertTriangle className="size-3.5" />
      {errorMessage ?? "Save failed"}
      {onRetry && (
        <button
          type="button"
          className="font-medium underline underline-offset-2"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </span>
  );
}
