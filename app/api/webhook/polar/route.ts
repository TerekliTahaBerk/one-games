import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/access/db";
import {
  asRecord,
  emailForEvent,
  eventIdFor,
  periodEndFor,
  statusForEvent,
  subscriptionIdsFor,
} from "@/lib/access/billing";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const body = await request.text();
  const headerRecord: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headerRecord[key] = value;
  });

  // An unsigned or mis-signed delivery never reaches the database.
  try {
    validateEvent(body, headerRecord, secret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    throw error;
  }

  const payload = asRecord(JSON.parse(body));
  const type = typeof payload.type === "string" ? payload.type : "unknown";
  const data = asRecord(payload.data);
  const eventId = eventIdFor(request.headers.get("webhook-id"), payload, data);

  const db = await getDatabase();
  const duplicate = await db
    .prepare("SELECT id FROM billing_events WHERE id = ?")
    .bind(eventId)
    .first();
  if (duplicate) return NextResponse.json({ ok: true, duplicate: true });

  const email = emailForEvent(data);
  const status = statusForEvent(type, data);

  if (email && status) {
    const { subscriptionId, customerId } = subscriptionIdsFor(data);
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
      .bind(email, status, customerId, subscriptionId, periodEndFor(data), Date.now())
      .run();
  }

  // Recorded last so a failed write above is retried by Polar rather than
  // swallowed by the idempotency check.
  await db
    .prepare("INSERT INTO billing_events (id, event_type, processed_at) VALUES (?, ?, ?)")
    .bind(eventId, type, Date.now())
    .run();

  return NextResponse.json({ ok: true, status: status ?? "ignored" });
}
