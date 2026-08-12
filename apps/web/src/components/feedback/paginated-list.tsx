"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Client-side pagination for admin record lists.
 *
 * Lists here are loaded in full by their `/api/v1/admin/*` endpoint, so paging
 * happens in the browser. `items` may change under us (a record is created,
 * edited or deleted), so the rendered page is clamped to the current count
 * rather than stored clamped — deleting the last row on page 4 shows page 3.
 */
export function useWonFlowPagination<T>(items: readonly T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  const visible = useMemo(() => items.slice((currentPage - 1) * pageSize, currentPage * pageSize), [items, currentPage, pageSize]);

  return {
    visible,
    page: currentPage,
    pageCount,
    setPage: (next: number) => setPage(Math.min(Math.max(1, next), pageCount)),
    total: items.length,
    firstShown: items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1,
    lastShown: Math.min(currentPage * pageSize, items.length),
  };
}

const pageButtonClass = "inline-flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-xl border border-slate-200 px-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40";

/** Page numbers around the current page, with gaps collapsed to an ellipsis. */
function pageNumbers(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  return sorted.flatMap((value, index) => (index > 0 && value - sorted[index - 1]! > 1 ? ["gap" as const, value] : [value]));
}

export function WonFlowPagination({
  page,
  pageCount,
  onPageChange,
  firstShown,
  lastShown,
  total,
  noun = "records",
}: {
  page: number;
  pageCount: number;
  onPageChange(page: number): void;
  firstShown: number;
  lastShown: number;
  total: number;
  noun?: string;
}) {
  if (total === 0) return null;
  return (
    <nav aria-label={`${noun} pagination`} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
      <p className="text-xs font-semibold text-slate-500">Showing {firstShown}–{lastShown} of {total} {noun}</p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-1.5">
          <button className={pageButtonClass} disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button"><ChevronLeft aria-hidden="true" size={14} />Previous</button>
          {pageNumbers(page, pageCount).map((value, index) => value === "gap"
            ? <span className="px-1 text-xs font-bold text-slate-400" key={`gap-${index}`}>…</span>
            : <button aria-current={value === page ? "page" : undefined} className={`${pageButtonClass} ${value === page ? "border-blue-500 bg-blue-50 text-blue-700" : ""}`} key={value} onClick={() => onPageChange(value)} type="button">{value}</button>)}
          <button className={pageButtonClass} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} type="button">Next<ChevronRight aria-hidden="true" size={14} /></button>
        </div>
      ) : null}
    </nav>
  );
}
