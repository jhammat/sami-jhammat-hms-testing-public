import { dedupeGet } from "./dedupe";
import { invalidateApiCacheTags } from "./cache";
import type { ApiCacheTag } from "./cache";
import {
  WonFlowNetworkError,
  createApiErrorFromResponse,
} from "./errors";

/**
 * The one correct way to reach the server from a screen. No component
 * constructs a fetch by hand.
 *
 * Tenant/branch context is never a parameter here, on GET query objects or
 * on mutation bodies: `ForbidTenantId` makes passing a `tenantId` a compile
 * error. Every request goes through `credentials: "same-origin"`, so the
 * server derives tenant context from the session cookie instead — see
 * requireRequestContext() in @/lib/auth/permission-service.
 */

export type ApiQueryValue =
  | string
  | number
  | boolean
  | undefined;

export type ApiQuery = Record<string, ApiQueryValue>;

/**
 * Applied to a request body/query type to make a `tenantId` field a
 * compile-time error. Resolves to `object` (no-op) when the type has no
 * `tenantId` key, and to an unsatisfiable `{ tenantId: never }` when it
 * does — the intersection then rejects the call at the type level.
 */
export type ForbidTenantId<TValue> =
  TValue extends { tenantId: unknown } ? { tenantId: never } : object;

function buildUrl(path: string, query?: ApiQuery): string {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const search = params.toString();

  return search === "" ? path : `${path}?${search}`;
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text === "") {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function performRequest<TResponse>(
  url: string,
  init: RequestInit,
): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new WonFlowNetworkError();
  }

  const body = await parseJsonBody(response);

  if (!response.ok) {
    throw createApiErrorFromResponse(response.status, body);
  }

  return body as TResponse;
}

export interface ApiGetOptions<TQuery extends ApiQuery = ApiQuery> {
  query?: TQuery & ForbidTenantId<TQuery>;
  signal?: AbortSignal;
}

export function apiGet<TResponse, TQuery extends ApiQuery = ApiQuery>(
  path: string,
  options: ApiGetOptions<TQuery> = {},
): Promise<TResponse> {
  const url = buildUrl(path, options.query);

  // The underlying fetch is intentionally NOT wired to any one caller's
  // signal: dedupeGet shares this single request across every caller
  // asking for the same URL at once, so one caller unmounting (aborting
  // its own signal) must not cancel the request out from under every
  // other still-interested caller. Each caller still applies its own
  // signal below — a caller whose own signal already fired never sees
  // this result — it just doesn't reach back and kill the shared fetch.
  return dedupeGet(url, () =>
    performRequest<TResponse>(url, {
      method: "GET",
    }),
  ).then((body) => {
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return body;
  });
}

export interface ApiMutationOptions {
  signal?: AbortSignal;
  /** Cache tags to invalidate once this mutation succeeds, so any screen depending on them refetches. */
  invalidates?: readonly ApiCacheTag[];
}

async function performMutation<TResponse>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body: unknown,
  options: ApiMutationOptions,
): Promise<TResponse> {
  const response = await performRequest<TResponse>(path, {
    method,
    signal: options.signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (options.invalidates && options.invalidates.length > 0) {
    invalidateApiCacheTags(options.invalidates);
  }

  return response;
}

export function apiPost<TResponse, TBody extends object = Record<string, never>>(
  path: string,
  body: TBody & ForbidTenantId<TBody>,
  options: ApiMutationOptions = {},
): Promise<TResponse> {
  return performMutation<TResponse>("POST", path, body, options);
}

export function apiPatch<TResponse, TBody extends object = Record<string, never>>(
  path: string,
  body: TBody & ForbidTenantId<TBody>,
  options: ApiMutationOptions = {},
): Promise<TResponse> {
  return performMutation<TResponse>("PATCH", path, body, options);
}

export function apiDelete<TResponse = { success: true }>(
  path: string,
  options: ApiMutationOptions = {},
): Promise<TResponse> {
  return performMutation<TResponse>("DELETE", path, undefined, options);
}
