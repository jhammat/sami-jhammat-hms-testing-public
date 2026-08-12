"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * In-application confirmation, replacing `window.confirm`.
 *
 * Native dialogs render in browser chrome at the top of the window, outside the
 * product: they cannot be styled, they read as a browser warning rather than a
 * hospital action, and on some platforms they are suppressed entirely — which
 * silently cancels the action.
 */
export interface WonFlowConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
}

interface PendingConfirm extends WonFlowConfirmRequest {
  resolve(confirmed: boolean): void;
}

export function useWonFlowConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (request: WonFlowConfirmRequest) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...request, resolve });
      }),
    [],
  );

  const settle = useCallback((confirmed: boolean) => {
    setPending((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  const dialog = pending === null ? null : <ConfirmDialogView request={pending} onSettle={settle} />;

  return { confirm, dialog };
}

export function ConfirmDialogView({ request, onSettle }: { request: WonFlowConfirmRequest; onSettle(confirmed: boolean): void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSettle(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSettle]);

  const danger = request.tone !== "primary";

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div
        aria-describedby="wf-confirm-message"
        aria-labelledby="wf-confirm-title"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-[22px] border border-indigo-100 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.28)]"
        role="alertdialog"
      >
        <div className="flex items-start gap-3 px-5 pb-3 pt-5">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${danger ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"}`}>
            <AlertTriangle aria-hidden="true" size={19} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-950" id="wf-confirm-title">{request.title}</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600" id="wf-confirm-message">{request.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          <button
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            onClick={() => onSettle(false)}
            type="button"
          >
            {request.cancelLabel ?? "Cancel"}
          </button>
          <button
            className={`min-h-10 rounded-xl px-4 text-xs font-black text-white shadow-sm transition ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
            onClick={() => onSettle(true)}
            ref={confirmRef}
            type="button"
          >
            {request.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
