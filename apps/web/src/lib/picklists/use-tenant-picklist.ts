"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Client access to the tenant picklists that used to live in localStorage.
 *
 * The starter list ships in the bundle; anything staff have added since comes
 * from PostgreSQL and is merged on top, de-duplicated case-insensitively so a
 * seeded "Chest pain" and a typed "chest pain" stay one entry.
 */

export type TenantPicklistKind =
  | "CHIEF_COMPLAINT"
  | "DIAGNOSIS"
  | "LABORATORY_ORDER"
  | "RADIOLOGY_ORDER"
  | "CONSULTATION_ROOM";

export interface TenantPicklistEntry {
  id: string;
  kind: TenantPicklistKind;
  label: string;
  code: string | null;
  metadata: Record<string, unknown> | null;
}

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

export async function fetchTenantPicklists(kinds: readonly TenantPicklistKind[], signal?: AbortSignal) {
  const response = await fetch(`/api/v1/tenant/picklists?kinds=${kinds.join(",")}`, { cache: "no-store", signal });
  if (!response.ok) return [];
  const body = (await response.json()) as { entries?: TenantPicklistEntry[] };
  return body.entries ?? [];
}

export async function addTenantPicklistEntry(input: {
  kind: TenantPicklistKind;
  label: string;
  code?: string;
  metadata?: Record<string, unknown>;
}): Promise<TenantPicklistEntry | null> {
  const response = await fetch("/api/v1/tenant/picklists", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { entry?: TenantPicklistEntry };
  return body.entry ?? null;
}

/**
 * Merges one kind's saved entries over a seeded starter list.
 *
 * `toOption` turns a saved row back into whatever shape the calling screen
 * uses, so a screen holding `{ display, code, certainty }` keeps holding that
 * and does not have to learn the storage shape.
 *
 * Saved rows and locally added ones are kept as separate state and combined in
 * a memo, rather than merged into one list inside the effect — the merge is a
 * pure function of what is already known, so it does not belong in an effect.
 */
export function useTenantPicklist<T>(
  kind: TenantPicklistKind,
  seed: readonly T[],
  labelOf: (option: T) => string,
  toOption: (entry: TenantPicklistEntry) => T,
) {
  const [saved, setSaved] = useState<TenantPicklistEntry[]>([]);
  const [pending, setPending] = useState<T[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void (async () => {
        const entries = await fetchTenantPicklists([kind], controller.signal);
        if (!controller.signal.aborted) setSaved(entries);
      })();
    });
    return () => controller.abort();
  }, [kind]);

  const options = useMemo(() => {
    const seen = new Set<string>();
    const merged: T[] = [];
    const push = (option: T) => {
      const key = normalize(labelOf(option));
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(option);
    };
    for (const option of seed) push(option);
    for (const entry of saved) push(toOption(entry));
    // Anything added on this screen that the server has not echoed back yet.
    for (const option of pending) push(option);
    return merged;
  }, [seed, saved, pending, labelOf, toOption]);

  /** Optimistically shows the new option, then persists it for everyone else. */
  const add = useCallback(
    (option: T, input: { code?: string; metadata?: Record<string, unknown> } = {}) => {
      setPending((current) => [...current, option]);
      void addTenantPicklistEntry({ kind, label: labelOf(option), ...input });
    },
    [kind, labelOf],
  );

  return { options, add };
}
