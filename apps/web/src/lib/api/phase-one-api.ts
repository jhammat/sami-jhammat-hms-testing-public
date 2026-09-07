export class WonFlowApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "WonFlowApiError";
  }
}
export async function phaseOneApi<TResponse>(path: string, options?: RequestInit): Promise<TResponse> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...options?.headers },
  });
  const rawBody = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    if (response.status === 413) {
      throw new WonFlowApiError(
        413,
        "The uploaded photo or request data is too large for the server. Please select a smaller photo.",
        "payload-too-large",
      );
    }
    const errPayload =
      rawBody && typeof rawBody === "object"
        ? (rawBody as { error?: string; code?: string; message?: string })
        : null;
    const message =
      errPayload && (errPayload.error || errPayload.message)
        ? (errPayload.error || errPayload.message)!
        : response.status >= 500
          ? "The request could not be completed by the server. Please check the fields and try again."
          : "The request could not be completed.";
    const code = errPayload?.code;
    throw new WonFlowApiError(response.status, message, code);
  }
  return rawBody as TResponse;
}
