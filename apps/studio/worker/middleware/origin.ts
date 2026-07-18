import type { MiddlewareHandler } from "hono";
import type { Bindings, RuntimeConfig } from "../env";
import { ApiError } from "../errors";

interface OriginVariables {
  readonly runtimeConfig: RuntimeConfig;
}

type OriginEnvironment = {
  readonly Bindings: Bindings;
  readonly Variables: OriginVariables;
};

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export const originMiddleware: MiddlewareHandler<OriginEnvironment> = async (
  context,
  next,
) => {
  if (safeMethods.has(context.req.method)) {
    await next();
    return;
  }

  const origin = context.req.header("origin");
  const config = context.get("runtimeConfig");

  if (origin === undefined || !config.allowedOrigins.includes(origin)) {
    throw new ApiError(
      "ORIGIN_FORBIDDEN",
      403,
      "The request origin is not allowed.",
      false,
    );
  }

  context.header("access-control-allow-origin", origin);
  context.header("vary", "Origin");

  await next();
};
