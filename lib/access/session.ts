import { cookies } from "next/headers";
import { hasDatabase } from "./db";
import { randomToken, sha256 } from "./crypto";
import { findSession, insertSession, SESSION_TTL_MS } from "./store";

const SESSION_COOKIE = "onegames_session";
const TEST_COOKIE = "onegames_test";
const SESSION_SECONDS = SESSION_TTL_MS / 1000;

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
 *
 * Only the SHA-256 hash is stored, so the database never holds a value that
 * could be replayed as a cookie.
 */
export async function createAccessSession(email: string): Promise<string | null> {
  const token = randomToken();
  const stored = await insertSession(await sha256(token), email);
  return stored ? token : null;
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

  // Without storage a session token cannot be verified, so it grants nothing —
  // and says so, rather than looking like an expired session.
  if (!(await hasDatabase())) return { ...ANONYMOUS, status: "unavailable" };

  const row = await findSession(await sha256(token));
  if (!row) return { ...ANONYMOUS, status: "expired" };

  return {
    authenticated: true,
    email: row.email,
    status: row.status,
    allowed: row.status === "active",
    testMode: false,
  };
}
