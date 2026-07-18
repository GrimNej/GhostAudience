import type { MiddlewareHandler } from "hono";

export const securityHeadersMiddleware: MiddlewareHandler = async (context, next) => {
  await next();

  context.header("x-content-type-options", "nosniff");
  context.header("referrer-policy", "no-referrer");
  context.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
  context.header("cross-origin-resource-policy", "same-origin");
  context.header("cross-origin-opener-policy", "same-origin");

  if (context.req.path.startsWith("/api/")) {
    context.header("cache-control", "no-store, max-age=0");
  }
};
