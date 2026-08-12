"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  WonFlowAsyncDataState,
} from "./async-state";

import {
  isWonFlowRequestCancellation,
  normalizeWonFlowAsyncError,
} from "./async-state";

export interface UseWonFlowAsyncDataOptions<
  TData,
> {
  /**
   * A stable identity for this request.
   *
   * Change the key when filters, patient,
   * branch or other request inputs change.
   */
  key: string;

  loader: (
    signal: AbortSignal,
  ) => Promise<TData>;

  enabled?: boolean;

  initialData?: TData;

  isEmpty?: (
    data: TData,
  ) => boolean;

  /**
   * Preserve the existing data while
   * refreshing or while a retry fails.
   */
  retainPreviousData?: boolean;
}

export interface UseWonFlowAsyncDataResult<
  TData,
> extends WonFlowAsyncDataState<TData> {
  hasData: boolean;

  reload(): void;
  reset(): void;
}

function defaultIsEmpty<TData>(
  data: TData,
): boolean {
  if (Array.isArray(data)) {
    return data.length === 0;
  }

  return false;
}

function createInitialState<TData>(
  initialData: TData | undefined,

  isEmpty: (
    data: TData,
  ) => boolean,
): WonFlowAsyncDataState<TData> {
  if (initialData === undefined) {
    return {
      status: "idle",
      data: undefined,
      error: undefined,
      isRefreshing: false,
    };
  }

  return {
    status:
      isEmpty(initialData)
        ? "empty"
        : "success",

    data: initialData,
    error: undefined,
    isRefreshing: false,

    resolvedAt:
      new Date().toISOString(),
  };
}

export function useWonFlowAsyncData<
  TData,
>({
  key,
  loader,
  enabled = true,
  initialData,
  isEmpty = defaultIsEmpty,
  retainPreviousData = true,
}: UseWonFlowAsyncDataOptions<TData>):
  UseWonFlowAsyncDataResult<TData> {
  const loaderRef =
    useRef(loader);

  const isEmptyRef =
    useRef(isEmpty);

  const requestSequenceRef =
    useRef(0);

  const [
    reloadSequence,
    setReloadSequence,
  ] = useState(0);

  const [
    state,
    setState,
  ] = useState<
    WonFlowAsyncDataState<TData>
  >(() =>
    createInitialState(
      initialData,
      isEmpty,
    ),
  );

  useEffect(() => {
    loaderRef.current =
      loader;
  }, [loader]);

  useEffect(() => {
    isEmptyRef.current =
      isEmpty;
  }, [isEmpty]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller =
      new AbortController();

    const requestSequence =
      requestSequenceRef.current +
      1;

    requestSequenceRef.current =
      requestSequence;

    const requestedAt =
      new Date().toISOString();

    /**
     * Defer the loading-state update until after
     * the effect has finished running.
     *
     * This avoids a synchronous state update
     * directly inside the effect body.
     */
    queueMicrotask(() => {
      if (
        controller.signal.aborted ||
        requestSequence !==
          requestSequenceRef.current
      ) {
        return;
      }

      setState(
        (previousState) => {
          const preserveData =
            retainPreviousData &&
            previousState.data !==
              undefined;

          return {
            status:
              preserveData
                ? previousState.status ===
                  "empty"
                  ? "empty"
                  : "success"
                : "loading",

            data:
              preserveData
                ? previousState.data
                : undefined,

            error: undefined,

            isRefreshing:
              preserveData,

            requestedAt,

            resolvedAt:
              preserveData
                ? previousState
                    .resolvedAt
                : undefined,
          };
        },
      );
    });

    void loaderRef
      .current(controller.signal)
      .then((data) => {
        if (
          controller.signal.aborted ||
          requestSequence !==
            requestSequenceRef.current
        ) {
          return;
        }

        setState({
          status:
            isEmptyRef.current(data)
              ? "empty"
              : "success",

          data,
          error: undefined,
          isRefreshing: false,

          requestedAt,

          resolvedAt:
            new Date().toISOString(),
        });
      })
      .catch((error: unknown) => {
        if (
          controller.signal.aborted ||
          requestSequence !==
            requestSequenceRef.current ||
          isWonFlowRequestCancellation(
            error,
          )
        ) {
          return;
        }

        const normalizedError =
          normalizeWonFlowAsyncError(
            error,
          );

        setState(
          (previousState) => ({
            status: "error",

            data:
              retainPreviousData
                ? previousState.data
                : undefined,

            error:
              normalizedError,

            isRefreshing: false,

            requestedAt,

            resolvedAt:
              new Date().toISOString(),
          }),
        );
      });

    return () => {
      // Invalidate the request without aborting fetch. Next.js 16's
      // development overlay reports navigation-driven fetch aborts as
      // unhandled rejections even when the promise has a cancellation
      // handler. The sequence guard still prevents a stale response from
      // updating state after cleanup.
      if (
        requestSequence ===
        requestSequenceRef.current
      ) {
        requestSequenceRef.current += 1;
      }
    };
  }, [
    enabled,
    key,
    reloadSequence,
    retainPreviousData,
  ]);

  const reload =
    useCallback(() => {
      setReloadSequence(
        (currentValue) =>
          currentValue + 1,
      );
    }, []);

  const reset =
    useCallback(() => {
      requestSequenceRef.current +=
        1;

      setState(
        createInitialState(
          initialData,
          isEmptyRef.current,
        ),
      );
    }, [initialData]);

  const visibleState:
    WonFlowAsyncDataState<TData> =
    enabled
      ? state
      : {
          ...state,

          status:
            state.data === undefined
              ? "idle"
              : isEmpty(state.data)
                ? "empty"
                : "success",

          error: undefined,
          isRefreshing: false,
        };

  return {
    ...visibleState,

    hasData:
      visibleState.data !==
      undefined,

    reload,
    reset,
  };
}
