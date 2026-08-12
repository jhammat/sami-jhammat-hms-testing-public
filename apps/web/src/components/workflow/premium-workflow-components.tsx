"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import type {
  KeyboardEvent,
  ReactNode,
} from "react";

import {
  ChevronDown,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";

export const wonFlowInputClassName = [
  "min-h-11 w-full",
  "rounded-xl border",
  "border-slate-300",
  "bg-white px-3.5",
  "text-sm text-slate-950",
  "outline-none",
  "placeholder:text-slate-400",
  "hover:border-slate-400",
  "focus:border-blue-500",
  "focus:ring-4",
  "focus:ring-blue-100",
  "disabled:cursor-not-allowed",
  "disabled:bg-slate-100",
  "disabled:text-slate-500",
].join(" ");

export const wonFlowTextareaClassName = [
  wonFlowInputClassName,
  "min-h-28 resize-y py-3",
  "leading-6",
].join(" ");

export type WonFlowComponentTone =
  | "blue"
  | "violet"
  | "cyan"
  | "emerald"
  | "amber"
  | "rose"
  | "slate";

const sectionToneClassNames:
  Record<
    WonFlowComponentTone,
    string
  > = {
  blue:
    "border-blue-100 bg-blue-50/40 text-blue-700",

  violet:
    "border-violet-100 bg-violet-50/40 text-violet-700",

  cyan:
    "border-cyan-100 bg-cyan-50/40 text-cyan-700",

  emerald:
    "border-emerald-100 bg-emerald-50/40 text-emerald-700",

  amber:
    "border-amber-100 bg-amber-50/40 text-amber-700",

  rose:
    "border-rose-100 bg-rose-50/40 text-rose-700",

  slate:
    "border-slate-200 bg-slate-50 text-slate-600",
};

const badgeToneClassNames:
  Record<
    WonFlowComponentTone,
    string
  > = {
  blue:
    "border-blue-200 bg-blue-50 text-blue-700",

  violet:
    "border-violet-200 bg-violet-50 text-violet-700",

  cyan:
    "border-cyan-200 bg-cyan-50 text-cyan-700",

  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700",

  amber:
    "border-amber-200 bg-amber-50 text-amber-700",

  rose:
    "border-rose-200 bg-rose-50 text-rose-700",

  slate:
    "border-slate-200 bg-slate-100 text-slate-600",
};

interface WonFlowFormSectionProps {
  title: string;

  description?: string;

  icon?: ReactNode;

  actions?: ReactNode;

  status?: ReactNode;

  tone?: WonFlowComponentTone;

  compact?: boolean;

  children: ReactNode;
}

export function WonFlowFormSection({
  title,
  description,
  icon,
  actions,
  status,
  tone = "blue",
  compact = false,
  children,
}: WonFlowFormSectionProps) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_28px_rgba(15,23,42,0.045)]">
      <header
        className={[
          "flex flex-col gap-4",
          "border-b border-slate-200",
          compact
            ? "px-4 py-3.5"
            : "px-5 py-4 sm:px-6",
          "sm:flex-row",
          "sm:items-center",
          "sm:justify-between",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-start gap-3">
          {icon !== undefined ? (
            <div
              className={[
                "flex h-10 w-10",
                "shrink-0 items-center",
                "justify-center",
                "rounded-xl border",
                sectionToneClassNames[
                  tone
                ],
              ].join(" ")}
            >
              {icon}
            </div>
          ) : null}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black tracking-[-0.02em] text-slate-950">
                {title}
              </h2>

              {status}
            </div>

            {description !==
            undefined ? (
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {actions !==
        undefined ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {actions}
          </div>
        ) : null}
      </header>

      <div
        className={
          compact
            ? "p-4"
            : "p-5 sm:p-6"
        }
      >
        {children}
      </div>
    </section>
  );
}

interface WonFlowFieldProps {
  label: string;

  required?: boolean;

  error?: string;

  helperText?: string;

  horizontal?: boolean;

  children: ReactNode;
}

export function WonFlowField({
  label,
  required = false,
  error,
  helperText,
  horizontal = false,
  children,
}: WonFlowFieldProps) {
  return (
    <label
      className={[
        "block min-w-0",
        horizontal
          ? "sm:grid sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start sm:gap-4"
          : "",
      ].join(" ")}
    >
      <span
        className={[
          "flex items-center gap-1",
          "text-xs font-bold",
          "text-slate-600",
          horizontal
            ? "pt-3"
            : "",
        ].join(" ")}
      >
        {label}

        {required ? (
          <>
            <span
              aria-hidden="true"
              className="text-rose-500"
            >
              *
            </span>

            <span className="sr-only">
              required
            </span>
          </>
        ) : null}
      </span>

      <span
        className={
          horizontal
            ? "block min-w-0"
            : "mt-1.5 block min-w-0"
        }
      >
        {children}

        {error !==
        undefined ? (
          <span className="mt-1.5 block text-xs font-semibold leading-5 text-rose-600">
            {error}
          </span>
        ) : helperText !==
          undefined ? (
          <span className="mt-1.5 block text-xs leading-5 text-slate-400">
            {helperText}
          </span>
        ) : null}
      </span>
    </label>
  );
}

interface WonFlowStatusBadgeProps {
  label: string;

  tone?: WonFlowComponentTone;

  dot?: boolean;
}

export function WonFlowStatusBadge({
  label,
  tone = "slate",
  dot = false,
}: WonFlowStatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex min-h-7",
        "items-center gap-1.5",
        "rounded-full border",
        "px-2.5 py-1",
        "text-[11px] font-extrabold",
        badgeToneClassNames[
          tone
        ],
      ].join(" ")}
    >
      {dot ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      ) : null}

      {label}
    </span>
  );
}

interface WonFlowFilterBarProps {
  title?: string;

  description?: string;

  searchValue: string;

  onSearchChange:
    (value: string) => void;

  searchPlaceholder?: string;

  filters?: ReactNode;

  actions?: ReactNode;

  resultSummary?: string;

  onClear?: () => void;
}

export function WonFlowFilterBar({
  title = "Search and Filters",
  description,
  searchValue,
  onSearchChange,
  searchPlaceholder =
    "Search records",
  filters,
  actions,
  resultSummary,
  onClear,
}: WonFlowFilterBarProps) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-black tracking-[-0.015em] text-slate-950">
              {title}
            </h2>

            {description !==
            undefined ? (
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>

          {resultSummary !==
          undefined ? (
            <div className="text-xs font-bold text-slate-500">
              {resultSummary}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">
              Search records
            </span>

            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
              strokeWidth={2}
            />

            <input
              className={[
                wonFlowInputClassName,
                "pl-10",
              ].join(" ")}
              onChange={(
                event,
              ) => {
                onSearchChange(
                  event.target.value,
                );
              }}
              placeholder={
                searchPlaceholder
              }
              type="search"
              value={searchValue}
            />
          </label>

          {filters !==
          undefined ? (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:flex xl:items-center">
              {filters}
            </div>
          ) : null}

          {onClear !==
          undefined ? (
            <button
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              onClick={onClear}
              type="button"
            >
              Clear
            </button>
          ) : null}

          {actions !==
          undefined ? (
            <div className="flex flex-wrap gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export interface WonFlowTableColumn<
  TRecord,
> {
  id: string;

  header: ReactNode;

  cell:
    (
      record: TRecord,
    ) => ReactNode;

  className?: string;

  headerClassName?: string;
}

interface WonFlowDataTableProps<
  TRecord,
> {
  columns:
    readonly WonFlowTableColumn<TRecord>[];

  records:
    readonly TRecord[];

  rowKey:
    (
      record: TRecord,
    ) => string | number;

  selectedRowKey?:
    string | number;

  onRowClick?:
    (
      record: TRecord,
    ) => void;

  rowClassName?:
    (
      record: TRecord,
    ) => string;

  emptyTitle?: string;

  emptyDescription?: string;

  minimumWidthClassName?: string;
}

export function WonFlowDataTable<
  TRecord,
>({
  columns,
  records,
  rowKey,
  selectedRowKey,
  onRowClick,
  rowClassName,
  emptyTitle =
    "No records found",
  emptyDescription =
    "No records match the current search and filters.",
  minimumWidthClassName =
    "min-w-[900px]",
}: WonFlowDataTableProps<TRecord>) {
  function handleRowKeyboard(
    event:
      KeyboardEvent<HTMLTableRowElement>,

    record: TRecord,
  ) {
    if (
      onRowClick ===
      undefined
    ) {
      return;
    }

    if (
      event.key ===
        "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();

      onRowClick(record);
    }
  }

  if (
    records.length === 0
  ) {
    return (
      <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
        <div className="text-sm font-black text-slate-900">
          {emptyTitle}
        </div>

        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="wf-scrollbar overflow-x-auto rounded-[18px] border border-slate-200 bg-white">
      <table
        className={[
          "w-full border-collapse",
          minimumWidthClassName,
        ].join(" ")}
      >
        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
          <tr>
            {columns.map(
              (column) => (
                <th
                  className={[
                    "border-b",
                    "border-slate-200",
                    "px-4 py-3",
                    "text-left",
                    "text-[10px]",
                    "font-black",
                    "uppercase",
                    "tracking-[0.12em]",
                    "text-slate-500",
                    column
                      .headerClassName ??
                      "",
                  ].join(" ")}
                  key={column.id}
                >
                  {column.header}
                </th>
              ),
            )}
          </tr>
        </thead>

        <tbody>
          {records.map(
            (record) => {
              const key =
                rowKey(record);

              const selected =
                selectedRowKey !==
                  undefined &&
                String(key) ===
                  String(
                    selectedRowKey,
                  );

              return (
                <tr
                  aria-selected={
                    selected
                  }
                  className={[
                    "border-b",
                    "border-slate-100",
                    "last:border-b-0",
                    "transition",
                    selected
                      ? "bg-blue-50/80"
                      : "bg-white hover:bg-slate-50/80",
                    onRowClick !==
                    undefined
                      ? "cursor-pointer focus:bg-blue-50 focus:outline-none"
                      : "",
                    rowClassName?.(
                      record,
                    ) ?? "",
                  ].join(" ")}
                  key={key}
                  onClick={
                    onRowClick ===
                    undefined
                      ? undefined
                      : () => {
                          onRowClick(
                            record,
                          );
                        }
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    handleRowKeyboard(
                      event,
                      record,
                    );
                  }}
                  tabIndex={
                    onRowClick ===
                    undefined
                      ? undefined
                      : 0
                  }
                >
                  {columns.map(
                    (column) => (
                      <td
                        className={[
                          "px-4 py-3.5",
                          "align-middle",
                          "text-sm",
                          "text-slate-700",
                          column
                            .className ??
                            "",
                        ].join(" ")}
                        key={
                          column.id
                        }
                      >
                        {column.cell(
                          record,
                        )}
                      </td>
                    ),
                  )}
                </tr>
              );
            },
          )}
        </tbody>
      </table>
    </div>
  );
}

export interface WonFlowActionMenuItem {
  id: string;

  label: string;

  onSelect: () => void;

  tone?: "default" | "danger";

  disabled?: boolean;
}

interface WonFlowActionMenuProps {
  label?: string;

  items:
    readonly WonFlowActionMenuItem[];
}

export function WonFlowActionMenu({
  label = "Record actions",
  items,
}: WonFlowActionMenuProps) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const containerRef =
    useRef<HTMLDivElement>(
      null,
    );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleOutsideClick(
      event: PointerEvent,
    ) {
      if (
        containerRef.current !==
          null &&
        event.target instanceof
          Node &&
        !containerRef.current.contains(
          event.target,
        )
      ) {
        setOpen(false);
      }
    }

    function handleEscape(
      event: globalThis.KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handleOutsideClick,
    );

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick,
      );

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [open]);

  return (
    <div
      className="relative inline-flex"
      ref={containerRef}
    >
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        onClick={() => {
          setOpen(
            (currentState) =>
              !currentState,
          );
        }}
        type="button"
      >
        <MoreHorizontal
          size={18}
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-11 z-40 min-w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.16)]"
          role="menu"
        >
          {items.map(
            (item) => (
              <button
                className={[
                  "flex min-h-10",
                  "w-full items-center",
                  "rounded-lg px-3",
                  "text-left text-xs",
                  "font-bold",
                  item.tone ===
                  "danger"
                    ? "text-rose-600 hover:bg-rose-50"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
                  item.disabled
                    ? "cursor-not-allowed opacity-45"
                    : "",
                ].join(" ")}
                disabled={
                  item.disabled
                }
                key={item.id}
                onClick={() => {
                  item.onSelect();

                  setOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

interface WonFlowModalProps {
  open: boolean;

  title: string;

  description?: string;

  size?: "small" | "medium" | "large";

  onClose: () => void;

  footer?: ReactNode;

  children: ReactNode;
}

const modalSizeClassNames = {
  small: "max-w-md",
  medium: "max-w-2xl",
  large: "max-w-4xl",
} as const;

export function WonFlowModal({
  open,
  title,
  description,
  size = "medium",
  onClose,
  footer,
  children,
}: WonFlowModalProps) {
  const titleId =
    useId();

  const descriptionId =
    useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event: globalThis.KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    onClose,
    open,
  ]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-describedby={
        description ===
        undefined
          ? undefined
          : descriptionId
      }
      aria-labelledby={
        titleId
      }
      aria-modal="true"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[3px]"
      onClick={onClose}
      role="dialog"
    >
      <section
        className={[
          "max-h-[90vh]",
          "w-full overflow-hidden",
          "rounded-[22px]",
          "border border-slate-200",
          "bg-white",
          "shadow-[0_30px_90px_rgba(15,23,42,0.25)]",
          modalSizeClassNames[
            size
          ],
        ].join(" ")}
        onClick={(
          event,
        ) => {
          event.stopPropagation();
        }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2
              className="text-lg font-black tracking-[-0.025em] text-slate-950"
              id={titleId}
            >
              {title}
            </h2>

            {description !==
            undefined ? (
              <p
                className="mt-1 text-xs leading-5 text-slate-500"
                id={
                  descriptionId
                }
              >
                {description}
              </p>
            ) : null}
          </div>

          <button
            aria-label="Close dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X
              size={18}
            />
          </button>
        </header>

        <div className="wf-scrollbar max-h-[65vh] overflow-y-auto p-5 sm:p-6">
          {children}
        </div>

        {footer !==
        undefined ? (
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

interface WonFlowSelectButtonProps {
  label: string;

  value: string;

  onClick: () => void;
}

export function WonFlowSelectButton({
  label,
  value,
  onClick,
}: WonFlowSelectButtonProps) {
  return (
    <button
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3.5 text-left text-sm hover:border-blue-300 hover:bg-blue-50/30"
      onClick={onClick}
      type="button"
    >
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <span className="mt-0.5 block truncate font-bold text-slate-800">
          {value}
        </span>
      </span>

      <ChevronDown
        className="shrink-0 text-slate-400"
        size={17}
      />
    </button>
  );
}