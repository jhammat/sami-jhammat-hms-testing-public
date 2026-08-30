"use client";

import { useSyncExternalStore } from "react";

/**
 * Who the allied clinician is currently working on, published to the shell.
 *
 * The physiotherapy and dietetics sections now live in the sidebar, and four
 * of the six only mean anything once a patient has been chosen. The sidebar
 * sits outside the workspace and cannot see that choice, so the workspace
 * publishes it here and the sidebar reads it back.
 *
 * This is a store rather than context because the two components are on
 * opposite sides of the application shell - the shell renders `children`, so
 * a provider inside the workspace could never wrap the sidebar above it. The
 * codebase already signals across that boundary the same way for the profile
 * photo (`WONFLOW_AVATAR_CHANGED_EVENT`).
 *
 * It holds a display name only. Nothing here is an identifier and nothing is
 * persisted - it is cleared when the workspace unmounts.
 */

let activePatient: string | null = null;

const listeners = new Set<() => void>();

/** Called by an allied workspace when its chosen patient changes. */
export function publishActivePatient(label: string | null): void {
  const next = label && label.trim().length > 0 ? label.trim() : null;

  if (next === activePatient) return;

  activePatient = next;

  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): string | null {
  return activePatient;
}

/**
 * The server renders no patient, and so does the first client paint. Returning
 * a separate server snapshot keeps hydration from mismatching when a workspace
 * publishes before the shell has hydrated.
 */
function getServerSnapshot(): string | null {
  return null;
}

/** The chosen patient's display name, or `null` when nobody is chosen. */
export function useActivePatient(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
