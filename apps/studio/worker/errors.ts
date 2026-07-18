import type { ApiErrorCode } from "@ghost-audience/contracts";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";

export class ApiError extends Error {
  public constructor(
    public readonly code: ApiErrorCode,
    public readonly status: ContentfulStatusCode,
    message: string,
    public readonly retryable: boolean,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return new ApiError(
      "PROVIDER_UNAVAILABLE",
      503,
      "The connected audience model took too long to respond.",
      true,
    );
  }
  if (error instanceof z.ZodError) {
    return new ApiError(
      "INVALID_REQUEST",
      400,
      "The request failed schema validation.",
      false,
    );
  }
  return new ApiError(
    "INTERNAL_ERROR",
    500,
    "An unexpected internal error occurred.",
    false,
  );
}
