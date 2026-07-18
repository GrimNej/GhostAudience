import type { ApiErrorCode } from "@ghost-audience/contracts";
import { z } from "zod";

export class ApiError extends Error {
  public constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
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
  if (error instanceof z.ZodError) {
    return new ApiError("INVALID_REQUEST", 400, "The request failed schema validation.", false);
  }
  return new ApiError("INTERNAL_ERROR", 500, "An unexpected internal error occurred.", false);
}