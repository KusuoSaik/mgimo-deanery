-- Shared login protection, also used by the self-hosted deployment.
CREATE TABLE IF NOT EXISTS auth_attempts (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  reset_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_attempts_expiry_idx ON auth_attempts(reset_at);
