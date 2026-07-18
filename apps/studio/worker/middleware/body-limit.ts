import type { MiddlewareHandler } from "hono";

import { ApiError } from "../errors";

const maximumBodyBytes = 65_536;

export const bodyLimitMiddleware:
  MiddlewareHandler = async (
  context,
  next,
) => {
    if (
      context.req.method === "GET" ||
      context.req.method === "HEAD"
    ) {
      await next();
      return;
    }

    const contentLengthHeader =
      context.req.header("content-length");

    if (contentLengthHeader !== undefined) {
      const parsed = Number.parseInt(
        contentLengthHeader,
        10,
      );

      if (
        Number.isFinite(parsed) &&
        parsed > maximumBodyBytes
      ) {
        throw new ApiError(
          "PAYLOAD_TOO_LARGE",
          413,
          "The request payload exceeds 64 KiB.",
          false,
        );
      }
    }

    const cloned = context.req.raw.clone();
    const bytes = await cloned.arrayBuffer();

    if (bytes.byteLength > maximumBodyBytes) {
      throw new ApiError(
        "PAYLOAD_TOO_LARGE",
        413,
        "The request payload exceeds 64 KiB.",
        false,
      );
    }

    await next();
  };