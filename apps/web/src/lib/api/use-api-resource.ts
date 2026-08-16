"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { subscribeApiCacheTag } from "./cache";
import type { ApiCacheTag } from "./cache";
import { toApiError } from "./errors";
import type { WonFlowApiError } from "./errors";

/**
 * The one correct way for a screen to read data: GET + cache tags +
 * request de-duplication + revalidation on a matching mutation, all
 * behind a single status. Feed `status` straight to DataLoading /
 * DataEmpty / DataError / the success view — no screen invents its own
 * loading, empty or error handling.
 */

export type ApiResourceStatus =
  | "loading"
  | "empty"
  | "success"
  | "error";

export interface ApiResourceState<TData> {
  status: ApiResourceStatus;
  data: TData | undefined;
  error: WonFlowApiError | undefined;
  isRefreshing: boolean;
}

export interface UseApiResourceOptions<TData> {
  /** A stable identity for this request. Change it when the inputs (filters, id, ...) change. */
  key: string;

  fetcher: (signal: AbortSignal) => Promise<TData>;

  /** Cache tags this resource depends on. A mutation invalidating one of these triggers a reload. */
  tags?: readonly ApiCacheTag[];

  enabled?: boolean;

  isEmpty?: (data: TData) => boolean;
}

export interface UseApiResourceResult<TData> extends ApiResourceState<TData> {
  reload: () => void;
}

function defaultIsEmpty<TData>(data: TData): boolean {
  return Array.isArray(data) && data.length === 0;
}

export function useApiResource<TData>({
  key,
  fetcher,
  tags = [],
  enabled = true,
  isEmpty = defaultIsEmpty,
}: UseApiResourceOptions<TData>): UseApiResourceResult<TData> {
  const fetcherRef = useRef(fetcher);
  const isEmptyRef = useRef(isEmpty);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    isEmptyRef.current = isEmpty;
  }, [isEmpty]);

  const [reloadToken, setReloadToken] = useState(0);

  const [state, setState] = useState<ApiResourceState<TData>>({
    status: "loading",
    data: undefined,
    error: undefined,
    isRefreshing: false,
  });

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;

    // Deferred so the loading-state update happens after this effect has
    // finished running, instead of synchronously inside the effect body.
    queueMicrotask(() => {
      if (controller.signal.aborted || sequence !== requestSequenceRef.current) {
        return;
      }

      setState((previous) => ({
        status: previous.data !== undefined ? previous.status : "loading",
        data: previous.data,
        error: undefined,
        isRefreshing: previous.data !== undefined,
      }));
    });

    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (controller.signal.aborted || sequence !== requestSequenceRef.current) {
          return;
        }

        setState({
          status: isEmptyRef.current(data) ? "empty" : "success",
          data,
          error: undefined,
          isRefreshing: false,
        });
      })
      .catch((thrown: unknown) => {
        if (controller.signal.aborted || sequence !== requestSequenceRef.current) {
          return;
        }

        if (thrown instanceof DOMException && thrown.name === "AbortError") {
          return;
        }

        setState((previous) => ({
          status: "error",
          data: previous.data,
          error: toApiError(thrown),
          isRefreshing: false,
        }));
      });

    return () => {
      controller.abort();
    };
  }, [key, enabled, reloadToken]);

  const tagsKey = tags.join("|");

  useEffect(() => {
    if (tags.length === 0) {
      return;
    }

    const unsubscribes = tags.map((tag) => subscribeApiCacheTag(tag, reload));

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tagsKey is the stable identity for the tags array.
  }, [tagsKey, reload]);

  return {
    ...state,
    reload,
  };
}
