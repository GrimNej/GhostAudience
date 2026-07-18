import { z } from "zod";

export interface Bindings {
  readonly CONTROL_DB: D1Database;
  readonly ASSETS: Fetcher;
  readonly ENVIRONMENT: string;
  readonly PROVIDER_MODE: string;
  readonly ALLOWED_ORIGINS: string;
  readonly RATE_LIMIT_WINDOW_SECONDS: string;
  readonly RATE_LIMIT_MAX_REQUESTS: string;
  readonly DAILY_REQUEST_LIMIT: string;
  readonly MONTHLY_TOKEN_ALLOWANCE: string;
  readonly TOKEN_BUDGET_HARD_STOP: string;
  readonly FIXTURE_MODE_AVAILABLE: string;
  readonly RATE_LIMIT_SALT: string;
  readonly SESSION_SIGNING_SECRET: string;
  readonly WATSONX_API_KEY?: string;
  readonly WATSONX_PROJECT_ID?: string;
  readonly WATSONX_BASE_URL?: string;
  readonly WATSONX_MODEL_ID?: string;
  readonly WATSONX_API_VERSION?: string;
}

const PositiveIntegerString = z
  .string()
  .regex(/^\d+$/u)
  .transform((value) => Number.parseInt(value, 10))
  .pipe(z.number().int().positive());

const BooleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const CommonFields = {
  environment: z.enum([
    "development",
    "preview",
    "production",
    "test",
  ]),
  allowedOrigins: z.array(z.string().url()).min(1),
  rateLimitWindowSeconds: z.number().int().positive(),
  rateLimitMaxRequests: z.number().int().positive(),
  dailyRequestLimit: z.number().int().positive(),
  monthlyTokenAllowance: z.number().int().positive(),
  tokenBudgetHardStop: z.number().int().positive(),
  fixtureModeAvailable: z.boolean(),
  rateLimitSalt: z.string().min(32),
  sessionSigningSecret: z.string().min(32),
} as const;

const LiveConfigSchema = z
  .object({
    ...CommonFields,
    providerMode: z.literal("live"),
    watsonxApiKey: z.string().min(10),
    watsonxProjectId: z.string().min(3),
    watsonxBaseUrl: z
      .string()
      .url()
      .refine((value) => value.startsWith("https://")),
    watsonxModelId: z.string().min(3),
    watsonxApiVersion: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u),
  })
  .strict();

const FixtureConfigSchema = z
  .object({
    ...CommonFields,
    providerMode: z.literal("fixture"),
  })
  .strict();

const DisabledConfigSchema = z
  .object({
    ...CommonFields,
    providerMode: z.literal("disabled"),
  })
  .strict();

const RuntimeConfigSchema = z
  .discriminatedUnion("providerMode", [
    LiveConfigSchema,
    FixtureConfigSchema,
    DisabledConfigSchema,
  ])
  .superRefine((value, context) => {
    if (
      value.tokenBudgetHardStop >=
      value.monthlyTokenAllowance
    ) {
      context.addIssue({
        code: "custom",
        path: ["tokenBudgetHardStop"],
        message:
          "The hard stop must preserve a nonzero monthly safety reserve.",
      });
    }
  });

export type RuntimeConfig = z.infer<
  typeof RuntimeConfigSchema
>;
export type LiveRuntimeConfig = z.infer<
  typeof LiveConfigSchema
>;

function splitOrigins(value: string): readonly string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function readRuntimeConfig(
  bindings: Bindings,
): RuntimeConfig {
  const common = {
    environment: bindings.ENVIRONMENT,
    providerMode: bindings.PROVIDER_MODE,
    allowedOrigins: splitOrigins(bindings.ALLOWED_ORIGINS),
    rateLimitWindowSeconds: PositiveIntegerString.parse(
      bindings.RATE_LIMIT_WINDOW_SECONDS,
    ),
    rateLimitMaxRequests: PositiveIntegerString.parse(
      bindings.RATE_LIMIT_MAX_REQUESTS,
    ),
    dailyRequestLimit: PositiveIntegerString.parse(
      bindings.DAILY_REQUEST_LIMIT,
    ),
    monthlyTokenAllowance: PositiveIntegerString.parse(
      bindings.MONTHLY_TOKEN_ALLOWANCE,
    ),
    tokenBudgetHardStop: PositiveIntegerString.parse(
      bindings.TOKEN_BUDGET_HARD_STOP,
    ),
    fixtureModeAvailable: BooleanString.parse(
      bindings.FIXTURE_MODE_AVAILABLE,
    ),
    rateLimitSalt: bindings.RATE_LIMIT_SALT,
    sessionSigningSecret:
      bindings.SESSION_SIGNING_SECRET,
  };

  if (bindings.PROVIDER_MODE !== "live") {
    return RuntimeConfigSchema.parse(common);
  }

  return RuntimeConfigSchema.parse({
    ...common,
    providerMode: "live",
    watsonxApiKey: bindings.WATSONX_API_KEY,
    watsonxProjectId: bindings.WATSONX_PROJECT_ID,
    watsonxBaseUrl: bindings.WATSONX_BASE_URL,
    watsonxModelId: bindings.WATSONX_MODEL_ID,
    watsonxApiVersion: bindings.WATSONX_API_VERSION,
  });
}