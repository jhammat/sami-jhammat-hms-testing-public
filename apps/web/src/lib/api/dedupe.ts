/**
 * In-flight request de-duplication. If three components ask for the same
 * GET at the same moment, only one fetch happens — the other two await the
 * same promise.
 */

const inFlightRequests = new Map<string, Promise<unknown>>();

export function dedupeGet<TResponse>(
  key: string,
  run: () => Promise<TResponse>,
): Promise<TResponse> {
  const pending = inFlightRequests.get(key);

  if (pending) {
    return pending as Promise<TResponse>;
  }

  const request = run().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, request);

  return request;
}
