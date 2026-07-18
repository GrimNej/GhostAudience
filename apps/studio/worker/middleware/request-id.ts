import type { MiddlewareHandler } from "hono";

export const requestIdMiddleware: MiddlewareHandler =
  async (context, next) => {
    const supplied = context.req.header(
      "x-request-id",
    );

    const requestId =
      supplied !== undefined &&
      /^[A-Za-z0-9_-]{8,80}$/.test(supplied)
        ? supplied
        : crypto.randomUUID();

    context.set("requestId", requestId);
    context.header("x-request-id", requestId);

    await next();
  };