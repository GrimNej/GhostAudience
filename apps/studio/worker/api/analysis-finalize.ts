import {
  FinalizeRunInputSchema,
  FinalizeRunOutputSchema,
} from "@ghost-audience/contracts";
import type { Context } from "hono";
import { reservePrimaryBudgetOrContinuity } from "../budget/continuity-budget";
import {
  estimateRequestTokens,
  releaseTokenBudget,
  settleTokenBudget,
  type TokenReservation,
} from "../budget/token-budget";
import type { Bindings, RuntimeConfig } from "../env";
import { asApiError } from "../errors";
import {
  completeProviderRequest,
  failProviderRequest,
  reserveProviderRequest,
} from "../idempotency/provider-idempotency";
import type { NarrativeModelProvider } from "../providers/model-provider";
import { sha256Text } from "../validation/sha256-text";

interface Variables {
  readonly requestId: string;
  readonly runtimeConfig: RuntimeConfig;
  readonly anonymousSessionId: string;
}
type Environment = {
  readonly Bindings: Bindings;
  readonly Variables: Variables;
};

export function analysisFinalizeHandler(provider: NarrativeModelProvider) {
  return async (context: Context<Environment>): Promise<Response> => {
    const requestId = context.get("requestId");
    const parsed = FinalizeRunInputSchema.parse(await context.req.json());
    const input = { ...parsed, requestId };
    const idempotencyKey = await sha256Text(JSON.stringify(input));
    const now = Math.floor(Date.now() / 1000);
    const reservation = await reserveProviderRequest(
      context.env.CONTROL_DB,
      idempotencyKey,
      "finalize",
      now,
    );
    if (reservation.kind === "cached") {
      return context.json(FinalizeRunOutputSchema.parse(reservation.response));
    }

    let tokenReservation: TokenReservation | null = null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35_000);
    try {
      const config = context.get("runtimeConfig");
      const budgetRoute = await reservePrimaryBudgetOrContinuity(
        context.env.CONTROL_DB,
        config,
        estimateRequestTokens(JSON.stringify(input).length, 2_000),
        now,
        provider.finalizeRunWithContinuity !== undefined,
      );
      tokenReservation = budgetRoute.tokenReservation;
      const result = budgetRoute.useContinuityModel
        ? await provider.finalizeRunWithContinuity?.(input, controller.signal)
        : await provider.finalizeRun(input, controller.signal);
      if (result === undefined) {
        throw new Error("No continuity model is configured for finalization.");
      }
      const output = FinalizeRunOutputSchema.parse(result.output);
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
        idempotencyKey,
        reservation.ownerToken,
        output,
        Math.floor(Date.now() / 1000),
      );
      return context.json(output);
    } catch (error: unknown) {
      if (tokenReservation !== null) {
        await releaseTokenBudget(
          context.env.CONTROL_DB,
          tokenReservation,
          Math.floor(Date.now() / 1000),
        );
      }
      await failProviderRequest(
        context.env.CONTROL_DB,
        idempotencyKey,
        reservation.ownerToken,
        asApiError(error).code,
        Math.floor(Date.now() / 1000),
      );
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}
