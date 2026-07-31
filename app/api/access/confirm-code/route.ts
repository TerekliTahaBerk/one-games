import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/access/db";
import { hashCode } from "@/lib/access/crypto";
import { createAccessSession, setAccessCookie } from "@/lib/access/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: unknown; code?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; code?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });
  }

  const db = await getDatabase();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "storage_not_configured" },
      { status: 503 },
    );
  }

  const row = await db.prepare(
    `SELECT id, code_hash, expires_at, attempts
     FROM verification_codes
     WHERE email = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(email).first<{ id: string; code_hash: string; expires_at: number; attempts: number }>();

  if (!row || row.expires_at < Date.now()) {
    return NextResponse.json({ ok: false, error: "expired" }, { status: 410 });
  }
  if (row.attempts >= 5) {
    return NextResponse.json({ ok: false, error: "too_many" }, { status: 429 });
  }
  const incomingHash = await hashCode(email, code);
  if (incomingHash !== row.code_hash) {
    await db.prepare("UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?")
      .bind(row.id).run();
    return NextResponse.json({ ok: false, error: "incorrect" }, { status: 401 });
  }

  const now = Date.now();
  await db.batch([
    db.prepare("UPDATE verification_codes SET consumed_at = ? WHERE id = ?").bind(now, row.id),
    db.prepare(
      `INSERT INTO subscriptions (email, status, updated_at)
       VALUES (?, 'pending', ?)
       ON CONFLICT(email) DO NOTHING`,
    ).bind(email, now),
  ]);
  const token = await createAccessSession(email);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "storage_not_configured" },
      { status: 503 },
    );
  }
  await setAccessCookie(token);
  const subscription = await db.prepare("SELECT status FROM subscriptions WHERE email = ?")
    .bind(email).first<{ status: string }>();

  return NextResponse.json({
    ok: true,
    verified: true,
    email,
    status: subscription?.status ?? "pending",
    allowed: subscription?.status === "active",
  });
}
