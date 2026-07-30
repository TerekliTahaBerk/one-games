import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/access/db";
import { hashCode, randomCode, randomToken } from "@/lib/access/crypto";
import { sendVerificationEmail } from "@/lib/access/email";

export const dynamic = "force-dynamic";

const GENERIC_MESSAGE = "If the address is valid, a code has been sent.";

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });

  if (!process.env.EMAIL_VERIFICATION_SECRET || !process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "email_not_configured" },
      { status: 503 },
    );
  }

  const db = await getDatabase();
  const now = Date.now();
  const recent = await db.prepare(
    `SELECT created_at FROM verification_codes
     WHERE email = ? AND created_at > ?
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(email, now - 60_000).first<{ created_at: number }>();
  if (recent) {
    return NextResponse.json(
      { ok: false, error: "cooldown", retryAfterSeconds: 60 },
      { status: 429 },
    );
  }

  const code = randomCode();
  await db.prepare(
    `INSERT INTO verification_codes
      (id, email, code_hash, expires_at, attempts, consumed_at, created_at)
     VALUES (?, ?, ?, ?, 0, NULL, ?)`,
  ).bind(randomToken(16), email, await hashCode(email, code), now + 10 * 60_000, now).run();

  try {
    await sendVerificationEmail(email, code);
  } catch (error) {
    console.error("[onegames-verification] delivery failed", error);
    return NextResponse.json({ ok: false, error: "delivery_failed" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE, cooldownSeconds: 60 });
}
