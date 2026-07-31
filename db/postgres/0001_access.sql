-- OneGames access + billing schema (PostgreSQL).
--
-- Deliberately the same shape as the D1 schema in drizzle/, so one set of
-- queries serves both deploy targets. Timestamps are epoch milliseconds stored
-- as BIGINT rather than TIMESTAMPTZ: SQLite has no timezone-aware type, and
-- milliseconds compare identically on both engines with no conversion.

-- Everyone who has ever entered their email, whether or not they finished.
CREATE TABLE IF NOT EXISTS players (
  email          TEXT PRIMARY KEY,
  created_at     BIGINT  NOT NULL,
  verified_at    BIGINT,
  last_seen_at   BIGINT,
  code_requests  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_players_created ON players (created_at DESC);

-- Six-digit sign-in codes. Stored only as a keyed hash.
CREATE TABLE IF NOT EXISTS verification_codes (
  id           TEXT    PRIMARY KEY,
  email        TEXT    NOT NULL,
  code_hash    TEXT    NOT NULL,
  expires_at   BIGINT  NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  consumed_at  BIGINT,
  created_at   BIGINT  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email_created
  ON verification_codes (email, created_at DESC);

-- Session tokens, stored only as a SHA-256 hash of the cookie value.
CREATE TABLE IF NOT EXISTS access_sessions (
  token_hash  TEXT   PRIMARY KEY,
  email       TEXT   NOT NULL,
  expires_at  BIGINT NOT NULL,
  created_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_access_sessions_email ON access_sessions (email);
CREATE INDEX IF NOT EXISTS idx_access_sessions_expires ON access_sessions (expires_at);

-- Billing state. Only a signed Polar webhook may move status to 'active'.
CREATE TABLE IF NOT EXISTS subscriptions (
  email                  TEXT   PRIMARY KEY,
  status                 TEXT   NOT NULL DEFAULT 'pending',
  polar_checkout_id      TEXT,
  polar_customer_id      TEXT,
  polar_subscription_id  TEXT,
  current_period_end     BIGINT,
  updated_at             BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);

-- Delivered webhooks, so a retry cannot apply twice.
CREATE TABLE IF NOT EXISTS billing_events (
  id            TEXT   PRIMARY KEY,
  event_type    TEXT   NOT NULL,
  email         TEXT,
  processed_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_events_processed
  ON billing_events (processed_at DESC);
