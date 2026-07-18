import type { Context } from "hono";

export function healthHandler(
  context: Context,
): Response {
  return context.json({
    status: "ok",
    service: "ghost-audience",
    time: new Date().toISOString(),
  });
}