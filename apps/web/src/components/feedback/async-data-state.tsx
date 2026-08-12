"use client";

import type {
  ReactNode,
} from "react";

import {
  LockKeyhole,
  RefreshCw,
  SearchX,
  TriangleAlert,
} from "lucide-react";

import {
  WonFlowRouteLoader,
} from "@/components/brand/wonflow-route-loader";

import type {
  WonFlowAsyncDataState,
  WonFlowAsyncError,
} from "@/lib/data";

type StateTone =
  | "neutral"
  | "violet"
  | "warning"
  | "danger";

interface StateFrameProps {
  title: string;
  description: string;
  icon: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  tone?: StateTone;
  role?: "status" | "alert";
  live?: "polite" | "assertive";
}

const tones: Record<
  StateTone,
  {
    frame: string;
    icon: string;
    title: string;
    description: string;
  }
> = {
  neutral: {
    frame:
      "border-slate-200 bg-slate-50/70",
    icon:
      "bg-white text-slate-600 ring-slate-200",
    title:
      "text-slate-950",
    description:
      "text-slate-600",
  },
  violet: {
    frame:
      "border-violet-200 bg-violet-50/65",
    icon:
      "bg-white text-violet-700 ring-violet-200",
    title:
      "text-violet-950",
    description:
      "text-violet-800",
  },
  warning: {
    frame:
      "border-amber-200 bg-amber-50",
    icon:
      "bg-white text-amber-700 ring-amber-200",
    title:
      "text-amber-950",
    description:
      "text-amber-800",
  },
  danger: {
    frame:
      "border-red-200 bg-red-50",
    icon:
      "bg-white text-red-700 ring-red-200",
    title:
      "text-red-950",
    description:
      "text-red-800",
  },
};

function StateFrame({
  title,
  description,
  icon,
  action,
  compact = false,
  tone = "neutral",
  role = "status",
  live = "polite",
}: StateFrameProps) {
  const styles =
    tones[tone];

  return (
    <section
      aria-live={live}
      className={[
        "rounded-2xl border",
        styles.frame,
        compact
          ? "p-4"
          : "px-6 py-9",
      ].join(" ")}
      role={role}
    >
      <div
        className={[
          "flex",
          compact
            ? "items-start gap-4 text-left"
            : "flex-col items-center text-center",
        ].join(" ")}
      >
        <div
          aria-hidden="true"
          className={[
            "flex shrink-0 items-center justify-center",
            compact
              ? "h-10 w-10 rounded-xl"
              : "h-12 w-12 rounded-2xl",
            "shadow-sm ring-1",
            styles.icon,
          ].join(" ")}
        >
          {icon}
        </div>

        <div
          className={
            compact
              ? "min-w-0 flex-1"
              : "mt-4"
          }
        >
          <h3
            className={[
              "font-semibold",
              styles.title,
            ].join(" ")}
          >
            {title}
          </h3>

          <p
            className={[
              "text-sm leading-6",
              compact
                ? "mt-1"
                : "mx-auto mt-2 max-w-lg",
              styles.description,
            ].join(" ")}
          >
            {description}
          </p>

          {action ? (
            <div className="mt-5">
              {action}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export interface WonFlowLoadingStateProps {
  title?: string;
  description?: string;
  compact?: boolean;
}

export function WonFlowLoadingState({
  title = "Loading information",
  description =
    "WonFlow is preparing the requested data.",
  compact = false,
}: WonFlowLoadingStateProps) {
  return (
    <WonFlowRouteLoader
      compact={compact}
      label={
        description ||
        title
      }
      overlay={false}
      visible
    />
  );
}

export interface WonFlowEmptyStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function WonFlowEmptyState({
  title = "No records found",
  description =
    "There is currently no information matching this view.",
  action,
  compact = false,
}: WonFlowEmptyStateProps) {
  return (
    <StateFrame
      action={action}
      compact={compact}
      description={description}
      icon={
        <SearchX
          aria-hidden="true"
          size={22}
        />
      }
      title={title}
      tone="violet"
    />
  );
}

export interface WonFlowNotFoundStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function WonFlowNotFoundState({
  title = "Record not found",
  description =
    "The requested record does not exist or is no longer available.",
  action,
  compact = false,
}: WonFlowNotFoundStateProps) {
  return (
    <StateFrame
      action={action}
      compact={compact}
      description={description}
      icon={
        <SearchX
          aria-hidden="true"
          size={22}
        />
      }
      title={title}
      tone="neutral"
    />
  );
}

export interface WonFlowPermissionStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function WonFlowPermissionState({
  title = "Access restricted",
  description =
    "Your current account does not have permission to open this information.",
  action,
  compact = false,
}: WonFlowPermissionStateProps) {
  return (
    <StateFrame
      action={action}
      compact={compact}
      description={description}
      icon={
        <LockKeyhole
          aria-hidden="true"
          size={22}
        />
      }
      title={title}
      tone="warning"
    />
  );
}

export interface WonFlowErrorStateProps {
  error?: WonFlowAsyncError;
  title?: string;
  description?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function WonFlowErrorState({
  error,
  title,
  description,
  onRetry,
  compact = false,
}: WonFlowErrorStateProps) {
  const resolvedTitle =
    title ??
    error?.title ??
    "Unable to load information";

  const resolvedDescription =
    description ??
    error?.message ??
    "WonFlow could not complete the request.";

  const action =
    onRetry &&
    error?.retryable !== false ? (
      <button
        className={[
          "inline-flex min-h-11 items-center justify-center gap-2",
          "rounded-xl bg-red-700 px-4",
          "text-sm font-semibold text-white",
          "transition hover:bg-red-800",
          "focus-visible:outline-none",
          "focus-visible:ring-4 focus-visible:ring-red-200",
        ].join(" ")}
        onClick={onRetry}
        type="button"
      >
        <RefreshCw
          aria-hidden="true"
          size={17}
        />

        Try again
      </button>
    ) : undefined;

  return (
    <StateFrame
      action={action}
      compact={compact}
      description={
        resolvedDescription
      }
      icon={
        <TriangleAlert
          aria-hidden="true"
          size={22}
        />
      }
      live="assertive"
      role="alert"
      title={resolvedTitle}
      tone="danger"
    />
  );
}

export function WonFlowRefreshIndicator() {
  return (
    <div
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm"
      role="status"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 animate-pulse rounded-full bg-blue-500"
      />

      Refreshing
    </div>
  );
}

export interface WonFlowAsyncDataBoundaryProps<
  TData,
> {
  state:
    WonFlowAsyncDataState<TData>;

  children: (
    data: TData,
  ) => ReactNode;

  onRetry?: () => void;

  loadingTitle?: string;
  loadingDescription?: string;

  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

export function WonFlowAsyncDataBoundary<
  TData,
>({
  state,
  children,
  onRetry,
  loadingTitle,
  loadingDescription,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: WonFlowAsyncDataBoundaryProps<TData>) {
  if (
    (
      state.status === "idle" ||
      state.status === "loading"
    ) &&
    state.data === undefined
  ) {
    return (
      <WonFlowLoadingState
        description={
          loadingDescription
        }
        title={
          loadingTitle
        }
      />
    );
  }

  if (
    state.status === "empty"
  ) {
    return (
      <WonFlowEmptyState
        action={emptyAction}
        description={
          emptyDescription
        }
        title={emptyTitle}
      />
    );
  }

  if (
    state.status === "error" &&
    state.data === undefined
  ) {
    return (
      <WonFlowErrorState
        error={state.error}
        onRetry={onRetry}
      />
    );
  }

  if (
    state.data === undefined
  ) {
    return (
      <WonFlowErrorState
        description="WonFlow received an invalid data state."
        onRetry={onRetry}
        title="Data unavailable"
      />
    );
  }

  return (
    <div className="relative">
      {state.status ===
        "error" &&
      state.error ? (
        <div className="mb-4">
          <WonFlowErrorState
            compact
            error={state.error}
            onRetry={onRetry}
          />
        </div>
      ) : null}

      {state.isRefreshing ? (
        <div className="absolute right-3 top-3 z-10">
          <WonFlowRefreshIndicator />
        </div>
      ) : null}

      {children(
        state.data,
      )}
    </div>
  );
}
