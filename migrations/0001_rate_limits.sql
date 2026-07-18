PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  client_hash TEXT NOT NULL,
  bucket_kind TEXT NOT NULL CHECK (bucket_kind IN ('window', 'day')),
  bucket_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (client_hash, bucket_kind, bucket_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup
  ON rate_limit_buckets (updated_at);

CREATE TABLE IF NOT EXISTS provider_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  route_kind TEXT NOT NULL CHECK (route_kind IN ('step', 'finalize')),
  owner_token TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('in_progress', 'completed', 'failed')),
  response_json TEXT,
  response_sha256 TEXT,
  failure_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  CHECK (
    (state = 'completed' AND response_json IS NOT NULL AND response_sha256 IS NOT NULL)
    OR state <> 'completed'
  )
);

CREATE INDEX IF NOT EXISTS idx_provider_idempotency_expiry
  ON provider_idempotency (expires_at);

CREATE TABLE IF NOT EXISTS monthly_token_budget (
  month_key TEXT PRIMARY KEY,
  used_tokens INTEGER NOT NULL DEFAULT 0 CHECK (used_tokens >= 0),
  reserved_tokens INTEGER NOT NULL DEFAULT 0 CHECK (reserved_tokens >= 0),
  updated_at INTEGER NOT NULL
);