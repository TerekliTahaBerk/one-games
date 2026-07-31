import { getDatabase } from "./db";
import type { SubscriptionStatus } from "./billing";

/**
 * Every read and write OneGames makes against the access database.
 *
 * Route handlers own HTTP — parsing, status codes, cookies — and call in here
 * for anything that touches storage. Keeping the SQL in one place means the
 * same statements the app runs are the ones the integration check exercises,
 * rather than a copy that can drift.
 *
 * Every function returns `null`/`false` when there is no database configured.
 * None of them throw for that case, and none of them invent a result: callers
 * must decide what "storage unavailable" means for their endpoint.
 */

export const CODE_TTL_MS = 10 * 60_000;
export const CODE_MAX_ATTEMPTS = 5;
export const CODE_COOLDOWN_MS = 60_000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

export type VerificationCode = {
  id: string;
  code_hash: string;
  expires_at: number;
  attempts: number;
};

export type SessionRow = { email: string; status: string };

export type PlayerRow = {
  email: string;
  created_at: number;
  verified_at: number | null;
  last_seen_at: number | null;
  code_requests: number;
};

/* -------------------------------------------------------------------------- */
/* Verification                                                                */
/* -------------------------------------------------------------------------- */

/** True when a code was already issued to this address inside the cooldown. */
export async function hasRecentCode(email: string, now = Date.now()): Promise<boolean> {
  const db = await getDatabase();
  if (!db) return false;

  const row = await db
    .prepare(
      `SELECT created_at FROM verification_codes
       WHERE email = ? AND created_at > ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(email, now - CODE_COOLDOWN_MS)
    .first<{ created_at: number }>();

  return Boolean(row);
}

/**
 * Records a code request: the player (whether or not they ever verify) and the
 * hashed code itself, in one transaction.
 */
export async function recordCodeRequest(
  email: string,
  id: string,
  codeHash: string,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDatabase();
  if (!db) return false;

  await db.batch([
    // The top of the funnel is worth knowing, so an address is recorded the
    // moment it is entered rather than only once it verifies.
    db
      .prepare(
        `INSERT INTO players (email, created_at, code_requests)
         VALUES (?, ?, 1)
         ON CONFLICT(email) DO UPDATE SET code_requests = players.code_requests + 1`,
      )
      .bind(email, now),
    db
      .prepare(
        `INSERT INTO verification_codes
          (id, email, code_hash, expires_at, attempts, consumed_at, created_at)
         VALUES (?, ?, ?, ?, 0, NULL, ?)`,
      )
      .bind(id, email, codeHash, now + CODE_TTL_MS, now),
  ]);

  return true;
}

/** The newest unconsumed code for an address, expired or not. */
export async function latestOpenCode(email: string): Promise<VerificationCode | null> {
  const db = await getDatabase();
  if (!db) return null;

  return db
    .prepare(
      `SELECT id, code_hash, expires_at, attempts
       FROM verification_codes
       WHERE email = ? AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(email)
    .first<VerificationCode>();
}

export async function recordFailedAttempt(id: string): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db
    .prepare("UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?")
    .bind(id)
    .run();
}

/**
 * Burns the code and marks the address verified. The code is consumed in the
 * same transaction that records the verification, so a code can never be spent
 * without the player being credited for it.
 */
export async function completeVerification(
  email: string,
  codeId: string,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDatabase();
  if (!db) return false;

  await db.batch([
    db.prepare("UPDATE verification_codes SET consumed_at = ? WHERE id = ?").bind(now, codeId),
    // The first verification stamps the date; later ones only refresh last seen.
    db
      .prepare(
        `INSERT INTO players (email, created_at, verified_at, last_seen_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET
           verified_at = COALESCE(players.verified_at, excluded.verified_at),
           last_seen_at = excluded.last_seen_at`,
      )
      .bind(email, now, now, now),
    // A billing row exists from verification onward, always starting pending.
    // Only a signed webhook may ever move it to active.
    db
      .prepare(
        `INSERT INTO subscriptions (email, status, updated_at)
         VALUES (?, 'pending', ?)
         ON CONFLICT(email) DO NOTHING`,
      )
      .bind(email, now),
  ]);

  return true;
}

export async function getPlayer(email: string): Promise<PlayerRow | null> {
  const db = await getDatabase();
  if (!db) return null;
  return db.prepare("SELECT * FROM players WHERE email = ?").bind(email).first<PlayerRow>();
}

/* -------------------------------------------------------------------------- */
/* Sessions                                                                    */
/* -------------------------------------------------------------------------- */

export async function insertSession(
  tokenHash: string,
  email: string,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDatabase();
  if (!db) return false;

  await db
    .prepare(
      `INSERT INTO access_sessions (token_hash, email, expires_at, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(tokenHash, email, now + SESSION_TTL_MS, now)
    .run();

  return true;
}

/**
 * Resolves a session token hash to its address and current billing status.
 * Expired sessions resolve to `null`; an address with no billing row yet reads
 * as `pending` rather than granting anything.
 */
export async function findSession(
  tokenHash: string,
  now = Date.now(),
): Promise<SessionRow | null> {
  const db = await getDatabase();
  if (!db) return null;

  return db
    .prepare(
      `SELECT s.email, COALESCE(b.status, 'pending') AS status
       FROM access_sessions s
       LEFT JOIN subscriptions b ON b.email = s.email
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(tokenHash, now)
    .first<SessionRow>();
}

/** Housekeeping: drops sessions and codes that can no longer be used. */
export async function purgeExpired(now = Date.now()): Promise<boolean> {
  const db = await getDatabase();
  if (!db) return false;

  await db.batch([
    db.prepare("DELETE FROM access_sessions WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM verification_codes WHERE expires_at < ?").bind(now - CODE_TTL_MS),
  ]);

  return true;
}

/* -------------------------------------------------------------------------- */
/* Billing                                                                     */
/* -------------------------------------------------------------------------- */

export async function getSubscriptionStatus(email: string): Promise<string | null> {
  const db = await getDatabase();
  if (!db) return null;
  const row = await db
    .prepare("SELECT status FROM subscriptions WHERE email = ?")
    .bind(email)
    .first<{ status: string }>();
  return row?.status ?? null;
}

export async function recordCheckoutStarted(
  email: string,
  checkoutId: string,
  now = Date.now(),
): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db
    .prepare("UPDATE subscriptions SET polar_checkout_id = ?, updated_at = ? WHERE email = ?")
    .bind(checkoutId, now, email)
    .run();
}

export async function hasProcessedEvent(eventId: string): Promise<boolean> {
  const db = await getDatabase();
  if (!db) return false;
  const row = await db
    .prepare("SELECT id FROM billing_events WHERE id = ?")
    .bind(eventId)
    .first();
  return Boolean(row);
}

export async function markEventProcessed(
  eventId: string,
  eventType: string,
  email: string | null,
  now = Date.now(),
): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db
    .prepare(
      "INSERT INTO billing_events (id, event_type, email, processed_at) VALUES (?, ?, ?, ?)",
    )
    .bind(eventId, eventType, email, now)
    .run();
}

export async function applySubscriptionChange(change: {
  email: string;
  status: SubscriptionStatus;
  subscriptionId: string | null;
  customerId: string | null;
  currentPeriodEnd: number | null;
  now?: number;
}): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  await db
    .prepare(
      `INSERT INTO subscriptions
        (email, status, polar_customer_id, polar_subscription_id, current_period_end, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
        status = excluded.status,
        polar_customer_id = COALESCE(excluded.polar_customer_id, subscriptions.polar_customer_id),
        polar_subscription_id = COALESCE(excluded.polar_subscription_id, subscriptions.polar_subscription_id),
        current_period_end = excluded.current_period_end,
        updated_at = excluded.updated_at`,
    )
    .bind(
      change.email,
      change.status,
      change.customerId,
      change.subscriptionId,
      change.currentPeriodEnd,
      change.now ?? Date.now(),
    )
    .run();
}

/** Used by the integration check to clean up after itself. */
export async function deletePlayerData(email: string): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.batch([
    db.prepare("DELETE FROM access_sessions WHERE email = ?").bind(email),
    db.prepare("DELETE FROM verification_codes WHERE email = ?").bind(email),
    db.prepare("DELETE FROM billing_events WHERE email = ?").bind(email),
    db.prepare("DELETE FROM subscriptions WHERE email = ?").bind(email),
    db.prepare("DELETE FROM players WHERE email = ?").bind(email),
  ]);
}
