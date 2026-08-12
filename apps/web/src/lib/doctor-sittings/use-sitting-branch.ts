"use client";

import { useEffect, useState } from "react";

interface SittingBranch {
  id: string;
  name: string;
  timezone: string;
  isMainBranch: boolean;
}

/**
 * Resolves a real tenant branch to record a sitting against.
 *
 * The doctor portal's own branch id comes from the demo practice-location
 * layer, which is empty on a freshly provisioned tenant. Falling back to the
 * doctor's home branch (or the hospital's main branch) means a doctor can
 * always publish their sitting hours.
 */
export function useSittingBranch(preferredBranchId?: string) {
  const [branches, setBranches] = useState<SittingBranch[]>([]);
  const [defaultBranchId, setDefaultBranchId] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/v1/doctor/sittings", { credentials: "same-origin" });
        if (!response.ok) return;
        const body = await response.json() as { branches?: SittingBranch[]; defaultBranchId?: string | null };
        if (cancelled) return;
        setBranches(body.branches ?? []);
        setDefaultBranchId(body.defaultBranchId ?? undefined);
      } catch {
        // Leave the caller on its existing branch id; saving reports the error.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Prefer the portal's own branch when it maps to a real one.
  const resolvedBranchId = (preferredBranchId && branches.some((branch) => branch.id === preferredBranchId))
    ? preferredBranchId
    : preferredBranchId ?? defaultBranchId;

  return { branches, resolvedBranchId };
}
