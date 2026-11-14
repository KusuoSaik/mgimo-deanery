-- Run in the SAME database/branch as DATABASE_URL. Re-runnable; no student data is removed.
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  key TEXT PRIMARY KEY,
  timestamps BIGINT[] NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS ai_leases (
  id TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_leases_expiry_idx ON ai_leases(expires_at);
