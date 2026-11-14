-- Run once on a dedicated prototype database, not a real university system.
CREATE TABLE IF NOT EXISTS student_state (
 owner_id TEXT PRIMARY KEY,
 data JSONB NOT NULL,
 version INTEGER NOT NULL DEFAULT 0,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
