import {
  createSeededRandom,
} from "../core/seeded-random";

export type WonFlowMockServiceErrorCode =
  | "aborted"
  | "not-found"
  | "invalid-query"
  | "simulated-failure";

export class WonFlowMockServiceError
  extends Error {
  public readonly code:
    WonFlowMockServiceErrorCode;

  public readonly operationName?: string;

  public constructor(
    code:
      WonFlowMockServiceErrorCode,

    message: string,

    operationName?: string,
  ) {
    super(message);

    this.name =
      "WonFlowMockServiceError";

    this.code = code;
    this.operationName =
      operationName;
  }
}

export interface MockAsyncAdapterOptions {
  seed?: string;

  minimumLatencyMs?: number;
  maximumLatencyMs?: number;

  /**
   * A number from zero to one.
   *
   * Keep this at zero for normal demonstrations.
   */
  failureRate?: number;
}

export interface MockOperationContext {
  signal?: AbortSignal;
  operationName?: string;
}

export interface WonFlowMockAsyncAdapter {
  execute<TValue>(
    operation:
      () => TValue | Promise<TValue>,

    context?: MockOperationContext,
  ): Promise<TValue>;
}

function normalizeLatency(
  value: number | undefined,
  fallback: number,
): number {
  if (value === undefined) {
    return fallback;
  }

  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      "Mock latency must be a non-negative whole number.",
    );
  }

  return value;
}

function normalizeFailureRate(
  value: number | undefined,
): number {
  if (value === undefined) {
    return 0;
  }

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      "Mock failure rate must be between zero and one.",
    );
  }

  return value;
}

function createAbortedError(
  operationName?: string,
): WonFlowMockServiceError {
  return new WonFlowMockServiceError(
    "aborted",
    "The mock service request was cancelled.",
    operationName,
  );
}

function throwIfRequestWasAborted(
  signal: AbortSignal | undefined,
  operationName?: string,
): void {
  if (signal?.aborted === true) {
    throw createAbortedError(
      operationName,
    );
  }
}

async function waitForMockLatency(
  milliseconds: number,
  context: MockOperationContext,
): Promise<void> {
  const {
    signal,
    operationName,
  } = context;

  if (signal?.aborted === true) {
    throw createAbortedError(
      operationName,
    );
  }

  await new Promise<void>(
    (resolve, reject) => {
      const timer:
        ReturnType<typeof setTimeout> =
        setTimeout(
          () => {
            signal?.removeEventListener(
              "abort",
              handleAbort,
            );

            resolve();
          },
          milliseconds,
        );

      function handleAbort(): void {
        clearTimeout(timer);

        reject(
          createAbortedError(
            operationName,
          ),
        );
      }

      signal?.addEventListener(
        "abort",
        handleAbort,
        {
          once: true,
        },
      );
    },
  );
}

export function createWonFlowMockAsyncAdapter(
  options:
    MockAsyncAdapterOptions = {},
): WonFlowMockAsyncAdapter {
  const minimumLatencyMs =
    normalizeLatency(
      options.minimumLatencyMs,
      120,
    );

  const maximumLatencyMs =
    normalizeLatency(
      options.maximumLatencyMs,
      320,
    );

  if (
    maximumLatencyMs <
    minimumLatencyMs
  ) {
    throw new Error(
      "Maximum mock latency cannot be lower than minimum latency.",
    );
  }

  const failureRate =
    normalizeFailureRate(
      options.failureRate,
    );

  const random =
    createSeededRandom(
      options.seed ??
        "wonflow-service-adapter-v1",
    );

  return {
    async execute<TValue>(
      operation:
        () => TValue | Promise<TValue>,

      context:
        MockOperationContext = {},
    ): Promise<TValue> {
      const latency =
        random.integer(
          minimumLatencyMs,
          maximumLatencyMs,
        );

      await waitForMockLatency(
        latency,
        context,
      );

      throwIfRequestWasAborted(
        context.signal,
        context.operationName,
      );

      if (
        failureRate > 0 &&
        random.next() < failureRate
      ) {
        throw new WonFlowMockServiceError(
          "simulated-failure",
          "The mock service generated a controlled demonstration failure.",
          context.operationName,
        );
      }

      const result =
        await operation();

      throwIfRequestWasAborted(
        context.signal,
        context.operationName,
      );

      return result;
    },
  };
}
