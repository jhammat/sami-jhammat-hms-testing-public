"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SaveState } from "@wonflow/ui";

import type { ApiCacheTag } from "./cache";
import { invalidateApiCacheTags } from "./cache";
import { toApiError } from "./errors";
import type { WonFlowApiError } from "./errors";

/**
 * The one correct way for a screen to write data: a `saveState` that
 * drives SaveIndicator directly (idle / saving / saved / failed), an
 * optional optimistic update applied immediately and rolled back on
 * failure, and cache-tag invalidation so dependent lists refresh.
 *
 * `mutate` never clears anything on failure — the caller's form state is
 * untouched unless `optimistic.rollback` explicitly restores it. A failed
 * save must never silently discard the person's input.
 */

export interface UseApiMutationOptions<TResponse, TVariables> {
  /** Cache tags to invalidate once this mutation succeeds. */
  invalidates?:
    | readonly ApiCacheTag[]
    | ((variables: TVariables, response: TResponse) => readonly ApiCacheTag[]);

  /** Applied immediately when mutate() is called, rolled back if the request fails. */
  optimistic?: {
    apply: (variables: TVariables) => void;
    rollback: (variables: TVariables, error: WonFlowApiError) => void;
  };
}

export interface UseApiMutationResult<TResponse, TVariables> {
  mutate: (variables: TVariables) => Promise<TResponse>;
  saveState: SaveState;
  error: WonFlowApiError | undefined;
  reset: () => void;
}

export function useApiMutation<TResponse, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TResponse>,
  options: UseApiMutationOptions<TResponse, TVariables> = {},
): UseApiMutationResult<TResponse, TVariables> {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<WonFlowApiError | undefined>(undefined);

  const optionsRef = useRef(options);
  const mutationFnRef = useRef(mutationFn);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    mutationFnRef.current = mutationFn;
  }, [mutationFn]);

  const mutate = useCallback(async (variables: TVariables): Promise<TResponse> => {
    setSaveState("saving");
    setError(undefined);

    optionsRef.current.optimistic?.apply(variables);

    try {
      const response = await mutationFnRef.current(variables);

      setSaveState("saved");

      const invalidates = optionsRef.current.invalidates;

      if (invalidates) {
        const tags = typeof invalidates === "function" ? invalidates(variables, response) : invalidates;

        if (tags.length > 0) {
          invalidateApiCacheTags(tags);
        }
      }

      return response;
    } catch (thrown) {
      const apiError = toApiError(thrown);

      optionsRef.current.optimistic?.rollback(variables, apiError);

      setSaveState("failed");
      setError(apiError);

      throw apiError;
    }
  }, []);

  const reset = useCallback(() => {
    setSaveState("idle");
    setError(undefined);
  }, []);

  return {
    mutate,
    saveState,
    error,
    reset,
  };
}
