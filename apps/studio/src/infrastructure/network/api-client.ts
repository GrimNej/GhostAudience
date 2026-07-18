import {
  ApiErrorEnvelopeSchema,
  CapabilitiesResponseSchema,
  StepAnalysisOutputSchema,
  type ApiErrorCode,
  type CapabilitiesResponse,
  type StepAnalysisInput,
  type StepAnalysisOutput,
} from "@ghost-audience/contracts";
import type { z } from "zod";

export class ApiClientError extends Error {
  public constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
    public readonly requestId: string,
    public readonly retryAfterSeconds?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApiClientError";
  }
}

function parseRetryAfter(response: Response): number | undefined {
  const value = response.headers.get("retry-after");
  if (value === null) return undefined;
  const seconds = Number.parseInt(value, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

export async function parseApiResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  let body: unknown = null;

  if (contentType.toLowerCase().includes("application/json")) {
    try {
      body = JSON.parse(text) as unknown;
    } catch (error: unknown) {
      throw new ApiClientError(
        "INTERNAL_ERROR",
        "The server returned malformed JSON.",
        response.status,
        response.status === 408 || response.status === 429 || response.status >= 500,
        response.headers.get("x-request-id") ?? "request_unknown",
        parseRetryAfter(response),
        { cause: error },
      );
    }
  }

  if (response.ok) return schema.parse(body);

  const parsed = ApiErrorEnvelopeSchema.safeParse(body);
  if (parsed.success) {
    throw new ApiClientError(
      parsed.data.error.code,
      parsed.data.error.message,
      response.status,
      parsed.data.error.retryable,
      parsed.data.error.requestId,
      parsed.data.error.retryAfterSeconds ?? parseRetryAfter(response),
    );
  }

  throw new ApiClientError(
    response.status === 429 ? "RATE_LIMITED" : "INTERNAL_ERROR",
    "The gateway returned an unreadable error response.",
    response.status,
    response.status === 408 || response.status === 429 || response.status >= 500,
    response.headers.get("x-request-id") ?? "request_unknown",
    parseRetryAfter(response),
  );
}

export class ApiClient {
  public async capabilities(signal?: AbortSignal): Promise<CapabilitiesResponse> {
    const response = await fetch("/api/v1/capabilities", { headers: { Accept: "application/json" }, signal });
    return parseApiResponse(response, CapabilitiesResponseSchema);
  }

  public async analyzeStep(input: StepAnalysisInput, signal: AbortSignal): Promise<StepAnalysisOutput> {
    const response = await fetch("/api/v1/analysis/step", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Idempotency-Key": input.idempotencyKey,
        "X-Request-ID": input.requestId,
      },
      body: JSON.stringify(input),
      signal,
    });
    return parseApiResponse(response, StepAnalysisOutputSchema);
  }
}