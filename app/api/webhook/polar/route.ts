import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/access/db";
import {
  asRecord,
  emailForEvent,
  eventIdFor,
  periodEndFor,
  statusForEvent,
  subscriptionIdsFor,
} from "@/lib/access/billing";
import {
  applySubscriptionChange,
  hasProcessedEvent,
  markEventProcessed,
} from "@/lib/access/store";

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

  if (!(await hasDatabase())) {
    // 503 asks Polar to retry rather than dropping the event, which would
    // leave a paying member without access.
    return NextResponse.json({ ok: false, error: "storage_not_configured" }, { status: 503 });
  }

  const payload = asRecord(JSON.parse(body));
  const type = typeof payload.type === "string" ? payload.type : "unknown";
  const data = asRecord(payload.data);
  const eventId = eventIdFor(request.headers.get("webhook-id"), payload, data);

  if (await hasProcessedEvent(eventId)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const email = emailForEvent(data);
  const status = statusForEvent(type, data);

  if (email && status) {
    const { subscriptionId, customerId } = subscriptionIdsFor(data);
    await applySubscriptionChange({
      email,
      status,
      subscriptionId,
      customerId,
      currentPeriodEnd: periodEndFor(data),
    });
  }

  // Recorded last, so a failed write above is retried by Polar rather than
  // swallowed by the idempotency check.
  await markEventProcessed(eventId, type, email);

  return NextResponse.json({ ok: true, status: status ?? "ignored" });
}
