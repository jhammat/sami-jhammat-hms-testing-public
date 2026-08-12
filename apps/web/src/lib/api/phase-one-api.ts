export class WonFlowApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); this.name = "WonFlowApiError"; }
}
export async function phaseOneApi<TResponse>(path: string, options?: RequestInit): Promise<TResponse> {
  const response = await fetch(path, { ...options, credentials: "same-origin", headers: { "content-type": "application/json", ...options?.headers } });
  const body = await response.json().catch(() => null) as TResponse | { error?: string } | null;
  if (!response.ok) throw new WonFlowApiError(response.status, body && typeof body === "object" && "error" in body && body.error ? body.error : "The request could not be completed.");
  return body as TResponse;
}
