import { ApiError } from "../errors";

interface IdempotencyRow {
  readonly owner_token: string;
  readonly state: "in_progress" | "completed" | "failed";
  readonly response_json: string | null;
  readonly expires_at: number;
}

export type ReservationResult =
  | { readonly kind: "owner"; readonly ownerToken: string }
  | { readonly kind: "cached"; readonly response: unknown };

async function readRow(
  database: D1Database,
  idempotencyKey: string,
): Promise<IdempotencyRow | null> {
  return database
    .prepare(`
      SELECT owner_token, state, response_json, expires_at
      FROM provider_idempotency
      WHERE idempotency_key = ?1
    `)
    .bind(idempotencyKey)
    .first<IdempotencyRow>();
}

export async function reserveProviderRequest(
  database: D1Database,
  idempotencyKey: string,
  routeKind: "step" | "finalize",
  nowEpochSeconds: number,
): Promise<ReservationResult> {
  const ownerToken = crypto.randomUUID();
  const expiresAt = nowEpochSeconds + 120;

  await database
    .prepare(`
      INSERT INTO provider_idempotency (
        idempotency_key,
        route_kind,
        owner_token,
        state,
        created_at,
        updated_at,
        expires_at
      )
      VALUES (?1, ?2, ?3, 'in_progress', ?4, ?4, ?5)
      ON CONFLICT (idempotency_key) DO NOTHING
    `)
    .bind(
      idempotencyKey,
      routeKind,
      ownerToken,
      nowEpochSeconds,
      expiresAt,
    )
    .run();

  let row = await readRow(database, idempotencyKey);
  if (row === null) {
    throw new ApiError(
      "INTERNAL_ERROR",
      500,
      "Idempotency reservation disappeared.",
      false,
    );
  }

  if (
    row.state === "completed" &&
    row.response_json !== null
  ) {
    return {
      kind: "cached",
      response: JSON.parse(row.response_json) as unknown,
    };
  }

  if (
    row.owner_token === ownerToken &&
    row.state === "in_progress"
  ) {
    return { kind: "owner", ownerToken };
  }

  if (
    (row.state === "in_progress" ||
      row.state === "failed") &&
    row.expires_at <= nowEpochSeconds
  ) {
    const takeover = await database
      .prepare(`
        UPDATE provider_idempotency
        SET owner_token = ?1,
            route_kind = ?2,
            updated_at = ?3,
            expires_at = ?4,
            state = 'in_progress',
            response_json = NULL,
            response_sha256 = NULL,
            failure_code = NULL
        WHERE idempotency_key = ?5
          AND state IN ('in_progress', 'failed')
          AND expires_at <= ?3
        RETURNING owner_token, state, response_json, expires_at
      `)
      .bind(
        ownerToken,
        routeKind,
        nowEpochSeconds,
        expiresAt,
        idempotencyKey,
      )
      .first<IdempotencyRow>();

    if (takeover?.owner_token === ownerToken) {
      return { kind: "owner", ownerToken };
    }
    row = await readRow(database, idempotencyKey);
  }

  if (
    row?.state === "completed" &&
    row.response_json !== null
  ) {
    return {
      kind: "cached",
      response: JSON.parse(row.response_json) as unknown,
    };
  }

  throw new ApiError(
    "IDEMPOTENCY_IN_PROGRESS",
    425,
    "An identical provider request is already in progress or cooling down after failure.",
    true,
    Math.max(
      1,
      (row?.expires_at ?? nowEpochSeconds + 5) -
        nowEpochSeconds,
    ),
  );
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function completeProviderRequest(
  database: D1Database,
  idempotencyKey: string,
  ownerToken: string,
  response: unknown,
  nowEpochSeconds: number,
): Promise<void> {
  const responseJson = JSON.stringify(response);
  const responseHash = await sha256Hex(responseJson);
  const result = await database
    .prepare(`
      UPDATE provider_idempotency
      SET state = 'completed',
          response_json = ?1,
          response_sha256 = ?2,
          updated_at = ?3,
          expires_at = ?4
      WHERE idempotency_key = ?5
        AND owner_token = ?6
        AND state = 'in_progress'
    `)
    .bind(
      responseJson,
      responseHash,
      nowEpochSeconds,
      nowEpochSeconds + 86_400,
      idempotencyKey,
      ownerToken,
    )
    .run();
  if (result.meta.changes !== 1) {
    throw new ApiError(
      "INVARIANT_VIOLATION",
      409,
      "The provider reservation fence was lost before completion.",
      false,
    );
  }
}

export async function failProviderRequest(
  database: D1Database,
  idempotencyKey: string,
  ownerToken: string,
  failureCode: string,
  nowEpochSeconds: number,
): Promise<void> {
  await database
    .prepare(`
      UPDATE provider_idempotency
      SET state = 'failed',
          failure_code = ?1,
          updated_at = ?2,
          expires_at = ?3
      WHERE idempotency_key = ?4
        AND owner_token = ?5
        AND state = 'in_progress'
    `)
    .bind(
      failureCode,
      nowEpochSeconds,
      nowEpochSeconds + 30,
      idempotencyKey,
      ownerToken,
    )
    .run();
}