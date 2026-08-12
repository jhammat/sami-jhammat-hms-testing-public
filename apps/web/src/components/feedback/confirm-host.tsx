"use client";

import { useEffect, useState } from "react";

import { ConfirmDialogView } from "./confirm-dialog";
import type { WonFlowConfirmRequest } from "./confirm-dialog";

/**
 * Application-wide confirmation host.
 *
 * Mounted once by the shell so any module can ask for a confirmation with a
 * plain `await wonflowConfirm(...)` — no hook, no per-component dialog markup.
 * Confirmations must never be browser-native dialogs: those render in browser
 * chrome outside the product and some platforms suppress them entirely, which
 * silently cancels the action.
 */
type Handler = (request: WonFlowConfirmRequest) => Promise<boolean>;

let activeHandler: Handler | null = null;

export async function wonflowConfirm(request: WonFlowConfirmRequest): Promise<boolean> {
  if (activeHandler !== null) return activeHandler(request);
  // No host mounted (a screen rendered outside the shell): fall back rather
  // than dropping the interaction entirely.
  return typeof window === "undefined" ? false : window.confirm(`${request.title}\n\n${request.message}`);
}

export function WonFlowConfirmHost() {
  const [pending, setPending] = useState<{ request: WonFlowConfirmRequest; resolve(value: boolean): void } | null>(null);

  useEffect(() => {
    activeHandler = (request) => new Promise<boolean>((resolve) => setPending({ request, resolve }));
    return () => {
      activeHandler = null;
    };
  }, []);

  if (pending === null) return null;

  return (
    <ConfirmDialogView
      request={pending.request}
      onSettle={(confirmed) => {
        pending.resolve(confirmed);
        setPending(null);
      }}
    />
  );
}
