import { ApiClientError } from "./api-client";

export interface RetryPolicy {
  readonly maximumAttempts: number;
  readonly baseDelayMs: number;
  readonly maximumDelayMs: number;
  readonly jitterMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maximumAttempts: 3,
  baseDelayMs: 750,
  maximumDelayMs: 12_000,
  jitterMs: 250,
};

export async function withRetry<T>(
  operation: (
    attempt: number,
    signal: AbortSignal,
  ) => Promise<T>,
  outerSignal: AbortSignal,
  policy: RetryPolicy =
    DEFAULT_RETRY_POLICY,
): Promise<T> {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= policy.maximumAttempts;
    attempt += 1
  ) {
    outerSignal.throwIfAborted();

    try {
      return await operation(
        attempt,
        outerSignal,
      );
    } catch (error: unknown) {
      lastError = error;

      if (
        !isRetryable(error) ||
        attempt === policy.maximumAttempts
      ) {
        throw error;
      }

      const explicitRetryMs =
        error instanceof ApiClientError &&
        error.retryAfterSeconds !== undefined
          ? error.retryAfterSeconds * 1_000
          : undefined;
      const exponentialMs = Math.min(
        policy.maximumDelayMs,
        policy.baseDelayMs *
          2 ** (attempt - 1),
      );
      const jitterMs =
        Math.random() * policy.jitterMs;
      const delayMs =
        explicitRetryMs ??
        exponentialMs + jitterMs;

      await abortableDelay(
        delayMs,
        outerSignal,
      );
    }
  }

  throw lastError;
}

function isRetryable(
  error: unknown,
): boolean {
  return (
    error instanceof ApiClientError &&
    error.retryable
  );
}

function abortableDelay(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      resolve,
      milliseconds,
    );

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}