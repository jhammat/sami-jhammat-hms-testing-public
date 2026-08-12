"use client";

import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

export type WonFlowActionButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost";

export interface WonFlowActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    WonFlowActionButtonVariant;

  icon?: ReactNode;
}

const BUTTON_VARIANTS:
  Record<
    WonFlowActionButtonVariant,
    string
  > = {
    primary: [
      "border-transparent",
      "bg-gradient-to-r",
      "from-blue-600",
      "to-indigo-600",
      "text-white",
      "shadow-sm",
      "hover:from-blue-700",
      "hover:to-indigo-700",
      "focus:ring-blue-500",
    ].join(" "),

    secondary: [
      "border-slate-200",
      "bg-white",
      "text-slate-700",
      "shadow-sm",
      "hover:border-blue-200",
      "hover:bg-blue-50",
      "hover:text-blue-700",
      "focus:ring-blue-500",
    ].join(" "),

    danger: [
      "border-red-200",
      "bg-red-50",
      "text-red-700",
      "hover:bg-red-100",
      "focus:ring-red-500",
    ].join(" "),

    ghost: [
      "border-transparent",
      "bg-transparent",
      "text-slate-600",
      "hover:bg-slate-100",
      "hover:text-slate-950",
      "focus:ring-slate-400",
    ].join(" "),
  };

export function WonFlowActionButton({
  variant = "secondary",
  icon,
  className,
  children,
  type = "button",
  ...buttonProps
}: WonFlowActionButtonProps) {
  return (
    <button
      className={[
        "inline-flex min-h-10",
        "items-center justify-center",
        "gap-2 rounded-xl",
        "border px-3.5 py-2",
        "text-sm font-bold",
        "transition",
        "focus:outline-none",
        "focus:ring-2",
        "focus:ring-offset-2",
        "disabled:cursor-not-allowed",
        "disabled:opacity-50",
        BUTTON_VARIANTS[
          variant
        ],
        className ?? "",
      ].join(" ")}
      type={type}
      {...buttonProps}
    >
      {icon !== undefined ? (
        <span
          aria-hidden="true"
          className="shrink-0"
        >
          {icon}
        </span>
      ) : null}

      {children}
    </button>
  );
}

export interface WonFlowActionBarProps {
  title?: string;
  description?: string;

  filters?: ReactNode;
  summary?: ReactNode;

  primaryActions?: ReactNode;
  secondaryActions?: ReactNode;

  sticky?: boolean;
}

export function WonFlowActionBar({
  title,
  description,
  filters,
  summary,
  primaryActions,
  secondaryActions,
  sticky = false,
}: WonFlowActionBarProps) {
  return (
    <section
      aria-label={
        title ??
        "Page controls"
      }
      className={[
        "rounded-2xl border",
        "border-slate-200/80",
        "bg-white/95",
        "p-4 shadow-sm",
        "backdrop-blur",
        sticky
          ? "sticky top-24 z-30"
          : "",
      ].join(" ")}
    >
      {(title !== undefined ||
        description !==
          undefined) && (
        <div className="mb-4">
          {title !== undefined ? (
            <h3 className="text-sm font-extrabold text-slate-900">
              {title}
            </h3>
          ) : null}

          {description !==
          undefined ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">
          {filters !== undefined ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {filters}
            </div>
          ) : null}

          {summary !== undefined ? (
            <div className="shrink-0 text-xs font-medium text-slate-500">
              {summary}
            </div>
          ) : null}
        </div>

        {(primaryActions !==
          undefined ||
          secondaryActions !==
            undefined) ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {secondaryActions}

            {primaryActions}
          </div>
        ) : null}
      </div>
    </section>
  );
}