import type { MiddlewareHandler } from "hono";
import type { Bindings, RuntimeConfig } from "../env";
import { ApiError } from "../errors";

interface Variables {
  readonly runtimeConfig: RuntimeConfig;
  readonly anonymousSessionId: string;
}

type Environment = { readonly Bindings: Bindings; readonly Variables: Variables };

const INCREMENT_BUCKET_SQL = `
  INSERT INTO rate_limit_buckets (
    client_hash, bucket_kind, bucket_start, request_count, updated_at
  ) VALUES (?1, ?2, ?3, 1, ?4)
  ON CONFLICT (client_hash, bucket_kind, bucket_start)
  DO UPDATE SET
    request_count = request_count + 1,
    updated_at = excluded.updated_at
  RETURNING request_count
`;

interface BucketCountRow {
  readonly request_count: number;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function enforceRateLimit(
  database: D1Database,
  clientHash: string,
  nowEpochSeconds: number,
  windowSeconds: number,
  windowLimit: number,
  dailyLimit: number,
): Promise<void> {
  const windowStart = Math.floor(nowEpochSeconds / windowSeconds) * windowSeconds;
  const dayStart = Math.floor(nowEpochSeconds / 86_400) * 86_400;

  const results = await database.batch<BucketCountRow>([
    database
      .prepare(INCREMENT_BUCKET_SQL)
      .bind(clientHash, "window", windowStart, nowEpochSeconds),
    database
      .prepare(INCREMENT_BUCKET_SQL)
      .bind(clientHash, "day", dayStart, nowEpochSeconds),
  ]);

  const windowCount = results[0]?.results[0]?.request_count;
  const dayCount = results[1]?.results[0]?.request_count;
  if (windowCount === undefined || dayCount === undefined) {
    throw new ApiError(
      "PROVIDER_UNAVAILABLE",
      503,
      "Rate-limit storage did not return both counters.",
      true,
      30,
    );
  }

  if (windowCount > windowLimit) {
    throw new ApiError(
      "RATE_LIMITED",
      429,
      "Too many analysis requests in the current window.",
      true,
      Math.max(1, windowSeconds - (nowEpochSeconds - windowStart)),
    );
  }

  if (dayCount > dailyLimit) {
    throw new ApiError(
      "PROVIDER_QUOTA_EXHAUSTED",
      429,
      "The daily live-analysis request allowance has been reached.",
      false,
      Math.max(1, 86_400 - (nowEpochSeconds - dayStart)),
    );
  }
}

export const rateLimitMiddleware: MiddlewareHandler<Environment> = async (
  context,
  next,
) => {
  if (!context.req.path.startsWith("/api/v1/analysis")) {
    await next();
    return;
  }

  const config = context.get("runtimeConfig");
  const rawIp = context.req.header("cf-connecting-ip") ?? "unknown";
  const sessionId = context.get("anonymousSessionId");
  const clientHash = await sha256Hex(`${config.rateLimitSalt}|${rawIp}|${sessionId}`);
  const now = Math.floor(Date.now() / 1000);

  await enforceRateLimit(
    context.env.CONTROL_DB,
    clientHash,
    now,
    config.rateLimitWindowSeconds,
    config.rateLimitMaxRequests,
    config.dailyRequestLimit,
  );

  context.executionCtx.waitUntil(
    context.env.CONTROL_DB.prepare(
      "DELETE FROM rate_limit_buckets WHERE updated_at < ?1",
    )
      .bind(now - 172_800)
      .run()
      .then(() => undefined)
      .catch(() => undefined),
  );

  await next();
};
