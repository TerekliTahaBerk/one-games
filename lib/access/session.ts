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

export async function createAccessSession(email: string): Promise<string> {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const now = Date.now();
  const db = await getDatabase();
  await db.prepare(
    `INSERT INTO access_sessions (token_hash, email, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  ).bind(tokenHash, email, now + SESSION_SECONDS * 1000, now).run();
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
  if (cookieStore.get(TEST_COOKIE)?.value === "1") {
    return { authenticated: true, email: null, status: "test", allowed: true, testMode: true };
  }
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return { authenticated: false, email: null, status: "anonymous", allowed: false, testMode: false };
  }
  const db = await getDatabase();
  const row = await db.prepare(
    `SELECT s.email, COALESCE(p.status, 'pending') AS status
     FROM access_sessions s
     LEFT JOIN subscriptions p ON p.email = s.email
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).bind(await sha256(token), Date.now()).first<{ email: string; status: string }>();
  if (!row) {
    return { authenticated: false, email: null, status: "expired", allowed: false, testMode: false };
  }
  const allowed = row.status === "active";
  return { authenticated: true, email: row.email, status: row.status, allowed, testMode: false };
}
