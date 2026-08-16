import type { WonFlowValidationIssue } from "@wonflow/validation";

/**
 * The typed errors every API call can produce. A screen switches on
 * `instanceof` (or `error.kind`) instead of inspecting a raw HTTP status,
 * so the UI reaction (redirect to login, show "not authorised", show a
 * conflict banner, ...) lives next to the request, not duplicated per
 * screen.
 */

export type WonFlowApiErrorKind =
  | "network"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "validation"
  | "server"
  | "unexpected";

export abstract class WonFlowApiError extends Error {
  abstract readonly kind: WonFlowApiErrorKind;

  /** HTTP status, or 0 for a network failure that never reached the server. */
  readonly status: number;

  /** Machine-readable code from the server's error body, when present. */
  readonly code: string | undefined;

  constructor(
    status: number,
    message: string,
    code?: string,
  ) {
    super(message);
    this.name = "WonFlowApiError";
    this.status = status;
    this.code = code;
  }
}

/** The request never reached the server: offline, DNS failure, timeout, aborted. */
export class WonFlowNetworkError extends WonFlowApiError {
  readonly kind = "network" as const;

  constructor(message = "WonFlow could not reach the server. Check the connection and try again.") {
    super(0, message);
    this.name = "WonFlowNetworkError";
  }
}

/** 401 — the session is missing or has expired. */
export class WonFlowUnauthorizedError extends WonFlowApiError {
  readonly kind = "unauthorized" as const;

  constructor(message = "Your session has expired. Sign in again to continue.", code?: string) {
    super(401, message, code);
    this.name = "WonFlowUnauthorizedError";
  }
}

/** 403 — signed in, but missing a required permission. */
export class WonFlowForbiddenError extends WonFlowApiError {
  readonly kind = "forbidden" as const;

  /** What the server says is required, for a NotAuthorized-style message. Falls back to the server message when the server did not name a specific requirement. */
  readonly requirement: string;

  constructor(message = "You do not have access to this.", code?: string) {
    super(403, message, code);
    this.name = "WonFlowForbiddenError";
    this.requirement = message;
  }
}

/** 404 — the resource does not exist, or is outside the caller's tenant. */
export class WonFlowNotFoundError extends WonFlowApiError {
  readonly kind = "not-found" as const;

  constructor(message = "That could not be found.", code?: string) {
    super(404, message, code);
    this.name = "WonFlowNotFoundError";
  }
}

/** 409 — the request conflicts with the current state (duplicate, stale version, concurrent edit). */
export class WonFlowConflictError extends WonFlowApiError {
  readonly kind = "conflict" as const;

  constructor(message = "This conflicts with a recent change. Refresh and try again.", code?: string) {
    super(409, message, code);
    this.name = "WonFlowConflictError";
  }
}

/** 422 — the request body failed validation. */
export class WonFlowValidationError extends WonFlowApiError {
  readonly kind = "validation" as const;

  readonly issues: readonly WonFlowValidationIssue[];

  constructor(message = "Check the highlighted fields and try again.", issues: readonly WonFlowValidationIssue[] = [], code?: string) {
    super(422, message, code);
    this.name = "WonFlowValidationError";
    this.issues = issues;
  }
}

/** 500 (and other 5xx) — the server failed to complete the request. */
export class WonFlowServerError extends WonFlowApiError {
  readonly kind = "server" as const;

  constructor(status: number, message = "Something went wrong on our end. Try again shortly.", code?: string) {
    super(status, message, code);
    this.name = "WonFlowServerError";
  }
}

/** Any other status the client does not have a specific type for. */
export class WonFlowUnexpectedApiError extends WonFlowApiError {
  readonly kind = "unexpected" as const;

  constructor(status: number, message = "The request could not be completed.", code?: string) {
    super(status, message, code);
    this.name = "WonFlowUnexpectedApiError";
  }
}

interface ErrorResponseBody {
  error?: string;
  code?: string;
  issues?: WonFlowValidationIssue[];
}

function isErrorResponseBody(value: unknown): value is ErrorResponseBody {
  return typeof value === "object" && value !== null;
}

/** Builds the typed error for a non-ok response, from its status and best-effort parsed JSON body. */
export function createApiErrorFromResponse(
  status: number,
  body: unknown,
): WonFlowApiError {
  const parsed = isErrorResponseBody(body) ? body : {};
  const message = typeof parsed.error === "string" && parsed.error.trim() !== "" ? parsed.error : undefined;
  const code = typeof parsed.code === "string" ? parsed.code : undefined;
  const issues = Array.isArray(parsed.issues) ? parsed.issues : undefined;

  switch (status) {
    case 401:
      return new WonFlowUnauthorizedError(message, code);
    case 403:
      return new WonFlowForbiddenError(message, code);
    case 404:
      return new WonFlowNotFoundError(message, code);
    case 409:
      return new WonFlowConflictError(message, code);
    case 422:
      return new WonFlowValidationError(message, issues, code);
    default:
      if (status >= 500) {
        return new WonFlowServerError(status, message, code);
      }
      return new WonFlowUnexpectedApiError(status, message, code);
  }
}

/** Normalizes anything caught around an API call into a WonFlowApiError, for call sites that cannot assume the client already did it. */
export function toApiError(error: unknown): WonFlowApiError {
  if (error instanceof WonFlowApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new WonFlowUnexpectedApiError(0, error.message);
  }

  return new WonFlowUnexpectedApiError(0, "The request could not be completed.");
}
