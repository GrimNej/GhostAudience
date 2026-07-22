import { describe, expect, it, vi } from "vitest";
import { reservePrimaryBudgetOrContinuity } from "../budget/continuity-budget";
import {
  estimateRequestTokens,
  readTokenBudget,
  releaseTokenBudget,
  reserveTokenBudget,
  settleTokenBudget,
} from "../budget/token-budget";
import type { RuntimeConfig } from "../env";

const liveConfig: RuntimeConfig = {
  environment: "test",
  providerMode: "live",
  allowedOrigins: ["https://example.test"],
  rateLimitWindowSeconds: 600,
  rateLimitMaxRequests: 30,
  dailyRequestLimit: 150,
  monthlyTokenAllowance: 300_000,
  tokenBudgetHardStop: 240_000,
  fixtureModeAvailable: true,
  rateLimitSalt: "s".repeat(32),
  sessionSigningSecret: "x".repeat(32),
  watsonxApiKey: "watsonx-test-key",
  watsonxProjectId: "watsonx-test-project",
  watsonxBaseUrl: "https://us-south.ml.cloud.ibm.com",
  watsonxModelId: "meta-llama/llama-3-3-70b-instruct",
  watsonxApiVersion: "2025-10-25",
};

function databaseWithFirst(value: unknown): D1Database {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({ first: vi.fn().mockResolvedValue(value) })),
    })),
  } as unknown as D1Database;
}

describe("token budget continuity", () => {
  it("reserves a primary-model budget when capacity remains", async () => {
    const database = databaseWithFirst({ used_tokens: 10_000, reserved_tokens: 5_000 });

    await expect(
      reservePrimaryBudgetOrContinuity(
        database,
        liveConfig,
        5_000,
        1_700_000_000,
        true,
      ),
    ).resolves.toMatchObject({
      tokenReservation: { estimatedTokens: 5_000 },
      useContinuityModel: false,
    });
    expect(estimateRequestTokens(3_001, 2_000)).toBe(3_001);
  });

  it("does not reserve model tokens outside live mode", async () => {
    const database = databaseWithFirst(null);
    const fixtureConfig: RuntimeConfig = {
      ...liveConfig,
      providerMode: "fixture",
    };

    await expect(
      reservePrimaryBudgetOrContinuity(
        database,
        fixtureConfig,
        5_000,
        1_700_000_000,
        false,
      ),
    ).resolves.toEqual({
      tokenReservation: null,
      useContinuityModel: false,
    });
    expect(database.prepare).not.toHaveBeenCalled();
  });

  it("settles and releases reservations through D1", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const database = {
      prepare: vi.fn(() => ({ bind: vi.fn(() => ({ run })) })),
    } as unknown as D1Database;
    const reservation = { monthKey: "2026-07", estimatedTokens: 5_000 };

    await settleTokenBudget(database, reservation, 1_200, 1_700_000_000);
    await releaseTokenBudget(database, reservation, 1_700_000_001);

    expect(run).toHaveBeenCalledTimes(2);
  });

  it("reports both populated and empty monthly budget rows", async () => {
    const populated = await readTokenBudget(
      databaseWithFirst({ used_tokens: 12_000, reserved_tokens: 3_000 }),
      liveConfig,
    );
    const empty = await readTokenBudget(databaseWithFirst(null), liveConfig);

    expect(populated).toMatchObject({
      used: 12_000,
      reserved: 3_000,
      remainingBeforeHardStop: 225_000,
    });
    expect(empty).toMatchObject({
      used: 0,
      reserved: 0,
      remainingBeforeHardStop: 240_000,
    });
  });

  it("rejects a direct reservation when no capacity remains", async () => {
    await expect(
      reserveTokenBudget(databaseWithFirst(null), liveConfig, 5_000, 1_700_000_000),
    ).rejects.toMatchObject({ code: "TOKEN_BUDGET_EXHAUSTED" });
  });
});
