import { env } from "cloudflare:workers";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    consumed_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_verification_codes_email_created
    ON verification_codes(email, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    email TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    polar_checkout_id TEXT,
    polar_customer_id TEXT,
    polar_subscription_id TEXT,
    current_period_end INTEGER,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS access_sessions (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_access_sessions_email
    ON access_sessions(email)`,
  `CREATE TABLE IF NOT EXISTS billing_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at INTEGER NOT NULL
  )`,
] as const;

let initialized = false;

export async function getDatabase(): Promise<D1Database> {
  const db = (env as unknown as { DB: D1Database }).DB;
  if (!initialized) {
    await db.batch(SCHEMA.map((statement) => db.prepare(statement)));
    initialized = true;
  }
  return db;
}
