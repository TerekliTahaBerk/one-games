import { cookies } from "next/headers";
import { getDatabase } from "./db";
import { randomToken, sha256 } from "./crypto";

const SESSION_COOKIE = "onegames_session";
const TEST_COOKIE = "onegames_test";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export type AccessState = {
  authenticated: boolean;
  email: string | null;
  status: string;
  allowed: boolean;
  testMode: boolean;
};

const ANONYMOUS: AccessState = {
  authenticated: false,
  email: null,
  status: "anonymous",
  allowed: false,
  testMode: false,
};

/**
 * Issues a session token, or `null` when this deployment has no storage to
 * record it in. Callers must treat `null` as "sign-in is unavailable" — never
 * as a successful sign-in.
 */
export async function createAccessSession(email: string): Promise<string | null> {
  const db = await getDatabase();
  if (!db) return null;

  const token = randomToken();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO access_sessions (token_hash, email, expires_at, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(await sha256(token), email, now + SESSION_SECONDS * 1000, now)
    .run();
  return token;
}

export async function setAccessCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function getAccessState(): Promise<AccessState> {
  const cookieStore = await cookies();

  // The test session is deliberately storage-free, so it works on any host.
  if (cookieStore.get(TEST_COOKIE)?.value === "1") {
    return { authenticated: true, email: null, status: "test", allowed: true, testMode: true };
  }

  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return ANONYMOUS;

  const db = await getDatabase();
  // Without storage a session token cannot be verified, so it grants nothing.
  if (!db) return { ...ANONYMOUS, status: "unavailable" };

  const row = await db
    .prepare(
      `SELECT s.email, COALESCE(p.status, 'pending') AS status
       FROM access_sessions s
       LEFT JOIN subscriptions p ON p.email = s.email
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(await sha256(token), Date.now())
    .first<{ email: string; status: string }>();

  if (!row) return { ...ANONYMOUS, status: "expired" };

  return {
    authenticated: true,
    email: row.email,
    status: row.status,
    allowed: row.status === "active",
    testMode: false,
  };
}
