import { NextResponse } from "next/server";
import { hashCode } from "@/lib/access/crypto";
import { hasDatabase } from "@/lib/access/db";
import { createAccessSession, setAccessCookie } from "@/lib/access/session";
import {
  CODE_MAX_ATTEMPTS,
  completeVerification,
  getSubscriptionStatus,
  latestOpenCode,
  recordFailedAttempt,
} from "@/lib/access/store";

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

  // Checked before the lookup: with no storage every code looks expired, and a
  // misconfigured deployment must not read as a wrong code.
  if (!(await hasDatabase())) {
    return NextResponse.json({ ok: false, error: "storage_not_configured" }, { status: 503 });
  }

  const open = await latestOpenCode(email);
  if (!open || open.expires_at < Date.now()) {
    return NextResponse.json({ ok: false, error: "expired" }, { status: 410 });
  }
  if (open.attempts >= CODE_MAX_ATTEMPTS) {
    return NextResponse.json({ ok: false, error: "too_many" }, { status: 429 });
  }

  if ((await hashCode(email, code)) !== open.code_hash) {
    await recordFailedAttempt(open.id);
    return NextResponse.json({ ok: false, error: "incorrect" }, { status: 401 });
  }

  if (!(await completeVerification(email, open.id))) {
    return NextResponse.json({ ok: false, error: "storage_not_configured" }, { status: 503 });
  }

  const token = await createAccessSession(email);
  if (!token) {
    return NextResponse.json({ ok: false, error: "storage_not_configured" }, { status: 503 });
  }
  await setAccessCookie(token);

  // Verification proves the address, never the payment.
  const status = (await getSubscriptionStatus(email)) ?? "pending";
  return NextResponse.json({
    ok: true,
    verified: true,
    email,
    status,
    allowed: status === "active",
  });
}
