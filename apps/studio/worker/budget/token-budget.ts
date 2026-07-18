import type { RuntimeConfig } from "../env";
import { ApiError } from "../errors";

interface BudgetRow {
  readonly used_tokens: number;
  readonly reserved_tokens: number;
}

export interface TokenReservation {
  readonly monthKey: string;
  readonly estimatedTokens: number;
}

function currentMonthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function estimateRequestTokens(
  inputCharacters: number,
  maximumOutputTokens: number,
): number {
  return Math.ceil(inputCharacters / 3) + maximumOutputTokens;
}

export async function reserveTokenBudget(
  database: D1Database,
  config: RuntimeConfig,
  estimatedTokens: number,
  nowEpochSeconds: number,
): Promise<TokenReservation> {
  const monthKey = currentMonthKey();
  const row = await database
    .prepare(`
    INSERT INTO monthly_token_budget (month_key, used_tokens, reserved_tokens, updated_at)
    VALUES (?1, 0, ?2, ?3)
    ON CONFLICT (month_key) DO UPDATE SET
      reserved_tokens = reserved_tokens + excluded.reserved_tokens,
      updated_at = excluded.updated_at
    WHERE used_tokens + reserved_tokens + excluded.reserved_tokens <= ?4
    RETURNING used_tokens, reserved_tokens
  `)
    .bind(monthKey, estimatedTokens, nowEpochSeconds, config.tokenBudgetHardStop)
    .first<BudgetRow>();

  if (row === null) {
    throw new ApiError(
      "TOKEN_BUDGET_EXHAUSTED",
      429,
      "The application has reached its watsonx Lite safety ceiling. Fixture mode remains available.",
      false,
    );
  }

  return { monthKey, estimatedTokens };
}

export async function settleTokenBudget(
  database: D1Database,
  reservation: TokenReservation,
  actualTokens: number,
  nowEpochSeconds: number,
): Promise<void> {
  await database
    .prepare(`
    UPDATE monthly_token_budget
    SET used_tokens = used_tokens + ?1,
        reserved_tokens = MAX(0, reserved_tokens - ?2),
        updated_at = ?3
    WHERE month_key = ?4
  `)
    .bind(
      actualTokens,
      reservation.estimatedTokens,
      nowEpochSeconds,
      reservation.monthKey,
    )
    .run();
}

export async function releaseTokenBudget(
  database: D1Database,
  reservation: TokenReservation,
  nowEpochSeconds: number,
): Promise<void> {
  await database
    .prepare(`
    UPDATE monthly_token_budget
    SET reserved_tokens = MAX(0, reserved_tokens - ?1),
        updated_at = ?2
    WHERE month_key = ?3
  `)
    .bind(reservation.estimatedTokens, nowEpochSeconds, reservation.monthKey)
    .run();
}

export async function readTokenBudget(
  database: D1Database,
  config: RuntimeConfig,
): Promise<{
  readonly monthlyAllowance: number;
  readonly hardStop: number;
  readonly used: number;
  readonly reserved: number;
  readonly remainingBeforeHardStop: number;
}> {
  const row = await database
    .prepare(
      "SELECT used_tokens, reserved_tokens FROM monthly_token_budget WHERE month_key = ?1",
    )
    .bind(currentMonthKey())
    .first<BudgetRow>();
  const used = row?.used_tokens ?? 0;
  const reserved = row?.reserved_tokens ?? 0;
  return {
    monthlyAllowance: config.monthlyTokenAllowance,
    hardStop: config.tokenBudgetHardStop,
    used,
    reserved,
    remainingBeforeHardStop: Math.max(0, config.tokenBudgetHardStop - used - reserved),
  };
}
