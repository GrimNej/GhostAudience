import { ApiClientError } from "./api-client";

export type CircuitState = "closed" | "open" | "half_open";

class CircuitOpenError extends Error {
  public constructor(public readonly retryAtEpochMs: number) {
    super("The AI provider circuit is open.");
    this.name = "CircuitOpenError";
  }
}

export interface CircuitBreakerOptions {
  readonly failureThreshold: number;
  readonly failureWindowMs: number;
  readonly coolDownMs: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 3,
  failureWindowMs: 120_000,
  coolDownMs: 60_000,
};

function isBreakerFailure(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return false;
  return (
    error instanceof ApiClientError &&
    error.code === "PROVIDER_UNAVAILABLE" &&
    error.retryable
  );
}

export class CircuitBreaker {
  private readonly failureTimes: number[] = [];
  private state: CircuitState = "closed";
  private openedAtEpochMs = 0;
  private halfOpenProbeActive = false;

  public constructor(
    private readonly options: CircuitBreakerOptions = DEFAULT_OPTIONS,
    private readonly clock: () => number = Date.now,
  ) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.advanceState();
    if (
      this.state === "open" ||
      (this.state === "half_open" && this.halfOpenProbeActive)
    ) {
      throw new CircuitOpenError(this.openedAtEpochMs + this.options.coolDownMs);
    }
    if (this.state === "half_open") this.halfOpenProbeActive = true;

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error: unknown) {
      if (isBreakerFailure(error)) this.recordFailure();
      throw error;
    } finally {
      this.halfOpenProbeActive = false;
    }
  }

  public snapshot(): {
    readonly state: CircuitState;
    readonly failureCount: number;
    readonly retryAtEpochMs: number | null;
  } {
    this.advanceState();
    return {
      state: this.state,
      failureCount: this.failureTimes.length,
      retryAtEpochMs:
        this.state === "open" ? this.openedAtEpochMs + this.options.coolDownMs : null,
    };
  }

  private advanceState(): void {
    const now = this.clock();
    this.removeExpiredFailures(now);
    if (this.state === "open" && now - this.openedAtEpochMs >= this.options.coolDownMs)
      this.state = "half_open";
  }

  private recordSuccess(): void {
    this.failureTimes.length = 0;
    this.state = "closed";
    this.openedAtEpochMs = 0;
  }

  private recordFailure(): void {
    const now = this.clock();
    this.failureTimes.push(now);
    this.removeExpiredFailures(now);
    if (
      this.state === "half_open" ||
      this.failureTimes.length >= this.options.failureThreshold
    ) {
      this.state = "open";
      this.openedAtEpochMs = now;
    }
  }

  private removeExpiredFailures(now: number): void {
    const cutoff = now - this.options.failureWindowMs;
    while (this.failureTimes[0] !== undefined && this.failureTimes[0] < cutoff)
      this.failureTimes.shift();
  }
}
