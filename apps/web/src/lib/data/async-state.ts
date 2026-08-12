import {
  WonFlowMockServiceError,
} from "@wonflow/mock-data";

export type WonFlowAsyncDataStatus =
  | "idle"
  | "loading"
  | "success"
  | "empty"
  | "error";

export type WonFlowAsyncErrorCode =
  | "aborted"
  | "not-found"
  | "invalid-query"
  | "simulated-failure"
  | "network-error"
  | "unexpected-error";

export interface WonFlowAsyncError {
  code: WonFlowAsyncErrorCode;

  title: string;
  message: string;

  retryable: boolean;

  operationName?: string;
}

export interface WonFlowAsyncDataState<TData> {
  status: WonFlowAsyncDataStatus;

  data: TData | undefined;
  error: WonFlowAsyncError | undefined;

  isRefreshing: boolean;

  requestedAt?: string;
  resolvedAt?: string;
}

export function normalizeWonFlowAsyncError(
  error: unknown,
): WonFlowAsyncError {
  if (
    error instanceof
    WonFlowMockServiceError
  ) {
    switch (error.code) {
      case "aborted":
        return {
          code: "aborted",
          title:
            "Request cancelled",
          message:
            "The data request was cancelled.",
          retryable: false,
          operationName:
            error.operationName,
        };

      case "not-found":
        return {
          code: "not-found",
          title:
            "Record not found",
          message:
            error.message,
          retryable: false,
          operationName:
            error.operationName,
        };

      case "invalid-query":
        return {
          code: "invalid-query",
          title:
            "Invalid request",
          message:
            error.message,
          retryable: false,
          operationName:
            error.operationName,
        };

      case "simulated-failure":
        return {
          code:
            "simulated-failure",
          title:
            "Unable to load data",
          message:
            error.message,
          retryable: true,
          operationName:
            error.operationName,
        };
    }
  }

  if (error instanceof TypeError) {
    return {
      code: "network-error",
      title:
        "Connection problem",
      message:
        "WonFlow could not complete the data request. Check the connection and try again.",
      retryable: true,
    };
  }

  if (error instanceof Error) {
    return {
      code:
        "unexpected-error",
      title:
        "Something went wrong",
      message:
        error.message ||
        "WonFlow could not complete the request.",
      retryable: true,
    };
  }

  return {
    code:
      "unexpected-error",
    title:
      "Something went wrong",
    message:
      "WonFlow encountered an unexpected data error.",
    retryable: true,
  };
}

export function isWonFlowRequestCancellation(
  error: unknown,
): boolean {
  if (
    error instanceof
      WonFlowMockServiceError &&
    error.code === "aborted"
  ) {
    return true;
  }

  if (
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return true;
  }

  return false;
}

export function isWonFlowCollectionEmpty<
  TItem,
>(
  value: readonly TItem[],
): boolean {
  return value.length === 0;
}

export function isWonFlowPageEmpty<
  TPage extends {
    items: readonly unknown[];
  },
>(
  value: TPage,
): boolean {
  return value.items.length === 0;
}