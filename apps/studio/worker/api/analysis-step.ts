import { StepAnalysisInputSchema, StepAnalysisOutputSchema } from "@ghost-audience/contracts";
import type { Context } from "hono";
import { asApiError, ApiError } from "../errors";
import type { Bindings, RuntimeConfig } from "../env";
import {
  completeProviderRequest,
  failProviderRequest,
  reserveProviderRequest,
} from "../idempotency/provider-idempotency";
import { SafeLogger } from "../observability/logger";
import { elapsedMilliseconds, nowMilliseconds } from "../observability/timings";
import { promptManifest } from "../prompts/manifest";
import type { NarrativeModelProvider } from "../providers/model-provider";
import {
  estimateRequestTokens,
  releaseTokenBudget,
  reserveTokenBudget,
  settleTokenBudget,
  type TokenReservation,
} from "../budget/token-budget";

interface Variables { readonly requestId: string; readonly runtimeConfig: RuntimeConfig; readonly anonymousSessionId: string; }
type Environment = { readonly Bindings: Bindings; readonly Variables: Variables };

export function analysisStepHandler(provider: NarrativeModelProvider) {
  return async (context: Context<Environment>): Promise<Response> => {
    const requestId = context.get("requestId");
    const startedAt = nowMilliseconds();
    const parsedInput = StepAnalysisInputSchema.parse(await context.req.json());
    const input = { ...parsedInput, requestId };
    const headerKey = context.req.header("x-idempotency-key");
    if (headerKey !== input.idempotencyKey) {
      throw new ApiError("INVALID_REQUEST", 400, "The idempotency header does not match the signed request body.", false);
    }

    const logger = new SafeLogger({
      requestId,
      route: "/api/v1/analysis/step",
      providerId: provider.providerId,
      promptVersion: promptManifest.step.version,
      ordinal: input.currentOrdinal,
    });
    const nowSeconds = Math.floor(Date.now() / 1000);
    const reservation = await reserveProviderRequest(
      context.env.CONTROL_DB,
      input.idempotencyKey,
      "step",
      nowSeconds,
    );

    if (reservation.kind === "cached") {
      return context.json(StepAnalysisOutputSchema.parse(reservation.response));
    }

    let tokenReservation: TokenReservation | null = null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);

    try {
      if (context.get("runtimeConfig").providerMode === "live") {
        const estimated = estimateRequestTokens(JSON.stringify(input).length, 3_500);
        tokenReservation = await reserveTokenBudget(context.env.CONTROL_DB, context.get("runtimeConfig"), estimated, nowSeconds);
      }

      const result = await provider.analyzeStep(input, controller.signal);
      const output = StepAnalysisOutputSchema.parse(result.output);
      if (tokenReservation !== null) {
        await settleTokenBudget(
          context.env.CONTROL_DB,
          tokenReservation,
          result.usage.totalTokens ?? tokenReservation.estimatedTokens,
          Math.floor(Date.now() / 1000),
        );
        tokenReservation = null;
      }
      await completeProviderRequest(
        context.env.CONTROL_DB,
        input.idempotencyKey,
        reservation.ownerToken,
        output,
        Math.floor(Date.now() / 1000),
      );
      logger.info("analysis_step_succeeded", {
        inputCharacterBucket: Math.ceil(input.currentSegment.text.length / 500) * 500,
        operationCount: output.questionOperations.length,
        latencyMs: elapsedMilliseconds(startedAt),
      });
      return context.json(output);
    } catch (error: unknown) {
      const apiError = asApiError(error);
      if (tokenReservation !== null) {
        await releaseTokenBudget(context.env.CONTROL_DB, tokenReservation, Math.floor(Date.now() / 1000));
      }
      await failProviderRequest(
        context.env.CONTROL_DB,
        input.idempotencyKey,
        reservation.ownerToken,
        apiError.code,
        Math.floor(Date.now() / 1000),
      );
      logger.error("analysis_step_failed", { errorCode: apiError.code, latencyMs: elapsedMilliseconds(startedAt) });
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}