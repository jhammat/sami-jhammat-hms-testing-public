"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiCacheTag } from "./cache";
import { invalidateApiCacheTags } from "./cache";
import { createApiErrorFromResponse, toApiError, WonFlowNetworkError } from "./errors";
import type { WonFlowApiError } from "./errors";

/**
 * The one way to perform a mutation in this codebase.
 *
 * Every prior pattern — `void fetch(...)`, a local write reported as success
 * before the network call resolves, a success message set synchronously
 * ahead of an `await` — let the interface claim something happened before
 * the server confirmed it did. `mutate()` cannot do that: it is an async
 * function, so nothing after it runs until the server has actually
 * responded, and the only way to get a `{ status: "success" }` result is a
 * 2xx response body.
 *
 * `useMutation()` is the same guarantee exposed as component state, for
 * screens that need a "saving…" indicator while the call is in flight.
 */

export type MutationResult<TData> =
  | { status: "success"; data: TData }
  | { status: "failure"; error: WonFlowApiError };

export type MutationState<TData> =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; data: TData }
  | { status: "failure"; error: WonFlowApiError };

export interface MutateOptions {
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Cache tags to invalidate — only fires once the server has confirmed success. */
  invalidates?: readonly ApiCacheTag[];
  signal?: AbortSignal;
}

/**
 * Performs one mutation and resolves once the server has responded. Never
 * throws for an HTTP error response — a non-2xx status becomes a typed
 * `{ status: "failure" }` result carrying the server's own code and message,
 * so a caller can pattern-match instead of wrapping every call in try/catch.
 * A genuine network failure (never reached the server) becomes the same
 * shape via `WonFlowNetworkError`, and never writes anything to
 * localStorage — there is nothing in this function that could.
 */
export async function mutate<TData = unknown>(
  url: string,
  options: MutateOptions = {},
): Promise<MutationResult<TData>> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method ?? "POST",
      credentials: "same-origin",
      headers: options.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (thrown) {
    if (thrown instanceof DOMException && thrown.name === "AbortError") throw thrown;
    return { status: "failure", error: new WonFlowNetworkError() };
  }

  const parsedBody = await response.json().catch(() => undefined) as unknown;

  if (!response.ok) {
    return { status: "failure", error: createApiErrorFromResponse(response.status, parsedBody) };
  }

  // Only reached once the server has actually confirmed the write — this is
  // the one place a dependent query is allowed to be told to refresh.
  if (options.invalidates?.length) {
    invalidateApiCacheTags(options.invalidates);
  }

  return { status: "success", data: parsedBody as TData };
}

export interface UseMutationResult<TData, TVariables> {
  state: MutationState<TData>;
  /** Runs the mutation and returns the same result it resolves `state` to — callers that need to branch immediately don't have to wait for a re-render. */
  run: (variables: TVariables) => Promise<MutationResult<TData>>;
  reset: () => void;
}

/**
 * Component-state form of `mutate()`. `state.status` starts at "idle", moves
 * to "pending" for the duration of the request, and only ever becomes
 * "success" after `mutate()` itself resolves successfully — there is no
 * code path that sets "success" ahead of the await.
 */
export function useMutation<TData = unknown, TVariables = void>(
  buildRequest: (variables: TVariables) => { url: string; options?: MutateOptions },
): UseMutationResult<TData, TVariables> {
  const [state, setState] = useState<MutationState<TData>>({ status: "idle" });
  const buildRequestRef = useRef(buildRequest);
  useEffect(() => {
    buildRequestRef.current = buildRequest;
  });

  const run = useCallback(async (variables: TVariables): Promise<MutationResult<TData>> => {
    setState({ status: "pending" });
    const { url, options } = buildRequestRef.current(variables);
    const result = await mutate<TData>(url, options);
    setState(result);
    return result;
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, run, reset };
}

export { toApiError };
export type { WonFlowApiError };
