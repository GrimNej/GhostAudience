import { describe, expect, it } from "vitest";
import { type Bindings, readRuntimeConfig } from "../env";

const common = {
  CONTROL_DB: {} as D1Database,
  ENVIRONMENT: "test",
  ALLOWED_ORIGINS: "https://example.test",
  RATE_LIMIT_SALT: "s".repeat(32),
  SESSION_SIGNING_SECRET: "x".repeat(32),
  RATE_LIMIT_WINDOW_SECONDS: "600",
  RATE_LIMIT_MAX_REQUESTS: "30",
  DAILY_REQUEST_LIMIT: "150",
  MONTHLY_TOKEN_ALLOWANCE: "300000",
  TOKEN_BUDGET_HARD_STOP: "240000",
  FIXTURE_MODE_AVAILABLE: "true",
} as const;

describe("runtime configuration modes", () => {
  it("does not require watsonx secrets in fixture mode", () => {
    const config = readRuntimeConfig({
      ...common,
      PROVIDER_MODE: "fixture",
    } as Bindings);
    expect(config.providerMode).toBe("fixture");
  });

  it("does not require watsonx secrets in disabled mode", () => {
    const config = readRuntimeConfig({
      ...common,
      PROVIDER_MODE: "disabled",
    } as Bindings);
    expect(config.providerMode).toBe("disabled");
  });

  it("requires live watsonx credentials", () => {
    expect(() =>
      readRuntimeConfig({
        ...common,
        PROVIDER_MODE: "live",
      } as Bindings),
    ).toThrow();
  });
});
