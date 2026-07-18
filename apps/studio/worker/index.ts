import { Hono } from "hono";
import { cors } from "hono/cors";
import { analysisFinalizeHandler } from "./api/analysis-finalize";
import { analysisStepHandler } from "./api/analysis-step";
import { capabilitiesHandler } from "./api/capabilities";
import { healthHandler } from "./api/health";
import { type Bindings, type RuntimeConfig, readRuntimeConfig } from "./env";
import { asApiError } from "./errors";
import { anonymousSessionMiddleware } from "./middleware/anonymous-session";
import { bodyLimitMiddleware } from "./middleware/body-limit";
import { originMiddleware } from "./middleware/origin";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { requestIdMiddleware } from "./middleware/request-id";
import { securityHeadersMiddleware } from "./middleware/security-headers";
import { DisabledProvider } from "./providers/disabled-provider";
import { FixtureProvider } from "./providers/fixture/fixture-provider";
import type { NarrativeModelProvider } from "./providers/model-provider";
import { WatsonxProvider } from "./providers/watsonx/watsonx-provider";

interface Variables {
  readonly requestId: string;
  readonly runtimeConfig: RuntimeConfig;
  readonly anonymousSessionId: string;
}

export type AppEnvironment = {
  readonly Bindings: Bindings;
  readonly Variables: Variables;
};
const app = new Hono<AppEnvironment>();

function createProvider(config: RuntimeConfig, ai: Ai): NarrativeModelProvider {
  if (config.providerMode === "live") return new WatsonxProvider(config, ai);
  if (config.providerMode === "fixture") return new FixtureProvider();
  return new DisabledProvider();
}

app.use("*", requestIdMiddleware);
app.use("*", securityHeadersMiddleware);
app.use("*", async (context, next) => {
  context.set("runtimeConfig", readRuntimeConfig(context.env));
  await next();
});
app.use("/api/*", anonymousSessionMiddleware);
app.use(
  "/api/*",
  cors({
    origin: (origin, context) =>
      context.get("runtimeConfig").allowedOrigins.includes(origin) ? origin : "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["content-type", "x-request-id", "x-idempotency-key"],
    exposeHeaders: ["x-request-id", "retry-after"],
    maxAge: 600,
    credentials: false,
  }),
);
app.use("/api/*", originMiddleware);
app.use("/api/*", bodyLimitMiddleware);
app.use("/api/v1/analysis/*", rateLimitMiddleware);

app.get("/api/v1/health", healthHandler);
app.get("/api/v1/capabilities", async (context) =>
  capabilitiesHandler(createProvider(context.get("runtimeConfig"), context.env.AI))(
    context,
  ),
);
app.post("/api/v1/analysis/step", async (context) =>
  analysisStepHandler(createProvider(context.get("runtimeConfig"), context.env.AI))(
    context,
  ),
);
app.post("/api/v1/analysis/finalize", async (context) =>
  analysisFinalizeHandler(createProvider(context.get("runtimeConfig"), context.env.AI))(
    context,
  ),
);

app.onError((error, context) => {
  const apiError = asApiError(error);
  const requestId = context.get("requestId") ?? crypto.randomUUID();
  if (apiError.retryAfterSeconds !== undefined)
    context.header("retry-after", String(apiError.retryAfterSeconds));
  return context.json(
    {
      error: {
        code: apiError.code,
        message: apiError.message,
        requestId,
        retryable: apiError.retryable,
        ...(apiError.retryAfterSeconds === undefined
          ? {}
          : { retryAfterSeconds: apiError.retryAfterSeconds }),
      },
    },
    apiError.status,
  );
});

app.notFound((context) =>
  context.json(
    {
      error: {
        code: "INVALID_REQUEST",
        message: "Route not found.",
        requestId: context.get("requestId") ?? crypto.randomUUID(),
        retryable: false,
      },
    },
    404,
  ),
);

export default app;
