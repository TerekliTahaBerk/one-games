import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/access/db";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? value as UnknownRecord : {};
}

function stringValue(...values: unknown[]): string | null {
  return values.find((value): value is string => typeof value === "string" && value.length > 0) ?? null;
}

function statusForEvent(type: string, data: UnknownRecord): string | null {
  const raw = typeof data.status === "string" ? data.status : "";
  if (type === "subscription.active" || raw === "active" || raw === "trialing") return "active";
  if (type === "subscription.past_due" || raw === "past_due" || raw === "unpaid") return "past_due";
  if (type === "subscription.revoked" || raw === "canceled") return "canceled";
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  const body = await request.text();
  const headerRecord: Record<string, string> = {};
  request.headers.forEach((value, key) => { headerRecord[key] = value; });
  try {
    validateEvent(body, headerRecord, secret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    throw error;
  }

  const payload = asRecord(JSON.parse(body));
  const type = stringValue(payload.type) ?? "unknown";
  const data = asRecord(payload.data);
  const metadata = asRecord(data.metadata);
  const customer = asRecord(data.customer);
  const email = stringValue(metadata.email, data.customerEmail, customer.email)?.toLowerCase() ?? null;
  const eventId = request.headers.get("webhook-id") || stringValue(payload.id) || `${type}:${stringValue(data.id) ?? Date.now()}`;
  const db = await getDatabase();
  const duplicate = await db.prepare("SELECT id FROM billing_events WHERE id = ?")
    .bind(eventId).first();
  if (duplicate) return NextResponse.json({ ok: true, duplicate: true });

  const status = statusForEvent(type, data);
  if (email && status) {
    const subscriptionId = stringValue(data.id, data.subscriptionId);
    const customerId = stringValue(data.customerId, customer.id);
    const periodEndRaw = stringValue(data.currentPeriodEnd, data.current_period_end);
    const periodEnd = periodEndRaw ? Date.parse(periodEndRaw) : null;
    await db.prepare(
      `INSERT INTO subscriptions
        (email, status, polar_customer_id, polar_subscription_id, current_period_end, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
        status = excluded.status,
        polar_customer_id = COALESCE(excluded.polar_customer_id, subscriptions.polar_customer_id),
        polar_subscription_id = COALESCE(excluded.polar_subscription_id, subscriptions.polar_subscription_id),
        current_period_end = excluded.current_period_end,
        updated_at = excluded.updated_at`,
    ).bind(email, status, customerId, subscriptionId, Number.isFinite(periodEnd) ? periodEnd : null, Date.now()).run();
  }
  await db.prepare(
    "INSERT INTO billing_events (id, event_type, processed_at) VALUES (?, ?, ?)",
  ).bind(eventId, type, Date.now()).run();
  return NextResponse.json({ ok: true });
}
