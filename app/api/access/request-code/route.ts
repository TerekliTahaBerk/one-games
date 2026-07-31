import { NextResponse } from "next/server";
import { hashCode, randomCode, randomToken } from "@/lib/access/crypto";
import { sendVerificationEmail } from "@/lib/access/email";
import { hasRecentCode, recordCodeRequest } from "@/lib/access/store";

export const dynamic = "force-dynamic";

/** Never confirms whether an address exists. */
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
    return NextResponse.json({ ok: false, error: "email_not_configured" }, { status: 503 });
  }

  if (await hasRecentCode(email)) {
    return NextResponse.json(
      { ok: false, error: "cooldown", retryAfterSeconds: 60 },
      { status: 429 },
    );
  }

  const code = randomCode();
  const stored = await recordCodeRequest(email, randomToken(16), await hashCode(email, code));
  if (!stored) {
    return NextResponse.json({ ok: false, error: "storage_not_configured" }, { status: 503 });
  }

  try {
    await sendVerificationEmail(email, code);
  } catch (error) {
    console.error("[onegames-verification] delivery failed", error);
    return NextResponse.json({ ok: false, error: "delivery_failed" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE, cooldownSeconds: 60 });
}
