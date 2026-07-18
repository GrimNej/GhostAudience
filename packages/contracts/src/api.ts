import { z } from "zod";
import { IdSchema, ProviderModeSchema } from "./common.js";

export const ApiErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "PAYLOAD_TOO_LARGE",
  "ORIGIN_FORBIDDEN",
  "RATE_LIMITED",
  "PROVIDER_DISABLED",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_QUOTA_EXHAUSTED",
  "PROVIDER_AUTH_FAILED",
  "MODEL_NOT_AVAILABLE",
  "MODEL_OUTPUT_INVALID",
  "EVIDENCE_INVALID",
  "PROMPT_INJECTION_BLOCKED",
  "INVARIANT_VIOLATION",
  "IDEMPOTENCY_IN_PROGRESS",
  "TOKEN_BUDGET_EXHAUSTED",
  "INTERNAL_ERROR",
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string().min(1).max(500),
    requestId: IdSchema,
    retryable: z.boolean(),
    retryAfterSeconds: z.number().int().positive().optional(),
  }).strict(),
}).strict();

export const CapabilitiesResponseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  liveAnalysisEnabled: z.boolean(),
  providerMode: ProviderModeSchema,
  providerId: z.string().min(1).max(100),
  modelId: z.string().min(1).max(200).nullable(),
  modelCatalogVerifiedAt: z.string().datetime({ offset: true }).nullable(),
  maxSegmentCharacters: z.number().int().positive(),
  maxOperations: z.number().int().positive(),
  fixtureModeAvailable: z.boolean(),
  tokenBudget: z.object({
    monthlyAllowance: z.number().int().positive(),
    hardStop: z.number().int().positive(),
    used: z.number().int().nonnegative(),
    reserved: z.number().int().nonnegative(),
    remainingBeforeHardStop: z.number().int().nonnegative(),
  }).strict(),
}).strict();

export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;
export type CapabilitiesResponse = z.infer<typeof CapabilitiesResponseSchema>;