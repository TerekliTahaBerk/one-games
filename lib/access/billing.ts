/**
 * Pure interpretation of Polar billing webhooks.
 *
 * Kept free of D1, cookies, and `next/server` so the mapping that decides who
 * gets access can be unit-tested directly. The route in
 * app/api/webhook/polar/route.ts does signature checking, idempotency, and
 * persistence; everything it *decides* lives here.
 */
export type SubscriptionStatus = "active" | "pending" | "past_due" | "canceled";

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "active",
  "pending",
  "past_due",
  "canceled",
];

export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function firstString(...values: unknown[]): string | null {
  return values.find((value): value is string => typeof value === "string" && value.length > 0) ?? null;
}

/**
 * Maps a Polar event to a subscription status, or `null` when the event says
 * nothing about access (product updates, checkout creation, and so on).
 *
 * Only an explicit active/trialing signal grants access — nothing here can
 * infer `active` from a missing or unrecognised field.
 */
export function statusForEvent(type: string, data: UnknownRecord): SubscriptionStatus | null {
  const raw = typeof data.status === "string" ? data.status.toLowerCase() : "";

  if (type === "subscription.revoked" || type === "subscription.canceled") return "canceled";
  if (type === "subscription.past_due") return "past_due";
  if (type === "subscription.active" || type === "subscription.created") {
    return raw === "past_due" || raw === "unpaid"
      ? "past_due"
      : raw === "canceled" || raw === "revoked"
        ? "canceled"
        : raw === "incomplete"
          ? "pending"
          : "active";
  }

  if (raw === "active" || raw === "trialing") return "active";
  if (raw === "past_due" || raw === "unpaid") return "past_due";
  if (raw === "canceled" || raw === "revoked") return "canceled";
  if (raw === "incomplete") return "pending";

  return null;
}

/** Finds the subscriber's address across the shapes Polar uses. */
export function emailForEvent(data: UnknownRecord): string | null {
  const metadata = asRecord(data.metadata);
  const customer = asRecord(data.customer);
  const email = firstString(
    metadata.email,
    data.customerEmail,
    data.customer_email,
    customer.email,
  );
  return email ? email.trim().toLowerCase() : null;
}

/**
 * A stable identity for the delivery, used for idempotency. Prefers Standard
 * Webhooks' `webhook-id` header, then the event id, then a type/object pair.
 */
export function eventIdFor(
  headerId: string | null,
  payload: UnknownRecord,
  data: UnknownRecord,
): string {
  const type = firstString(payload.type) ?? "unknown";
  return (
    firstString(headerId, payload.id) ?? `${type}:${firstString(data.id) ?? "unidentified"}`
  );
}

/** Polar sends ISO timestamps; anything unparseable becomes `null`. */
export function periodEndFor(data: UnknownRecord): number | null {
  const raw = firstString(data.currentPeriodEnd, data.current_period_end);
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function subscriptionIdsFor(data: UnknownRecord): {
  subscriptionId: string | null;
  customerId: string | null;
} {
  const customer = asRecord(data.customer);
  return {
    subscriptionId: firstString(data.id, data.subscriptionId, data.subscription_id),
    customerId: firstString(data.customerId, data.customer_id, customer.id),
  };
}
