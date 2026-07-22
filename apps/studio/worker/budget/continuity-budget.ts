import type { RuntimeConfig } from "../env";
import { asApiError } from "../errors";
import { reserveTokenBudget, type TokenReservation } from "./token-budget";

export interface BudgetRoute {
  readonly tokenReservation: TokenReservation | null;
  readonly useContinuityModel: boolean;
}

export async function reservePrimaryBudgetOrContinuity(
  database: D1Database,
  config: RuntimeConfig,
  estimatedTokens: number,
  nowEpochSeconds: number,
  continuityAvailable: boolean,
): Promise<BudgetRoute> {
  if (config.providerMode !== "live") {
    return { tokenReservation: null, useContinuityModel: false };
  }

  try {
    return {
      tokenReservation: await reserveTokenBudget(
        database,
        config,
        estimatedTokens,
        nowEpochSeconds,
      ),
      useContinuityModel: false,
    };
  } catch (error: unknown) {
    if (asApiError(error).code !== "TOKEN_BUDGET_EXHAUSTED" || !continuityAvailable) {
      throw error;
    }
    return { tokenReservation: null, useContinuityModel: true };
  }
}
