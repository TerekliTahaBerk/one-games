import { describe, expect, it } from "vitest";
import {
  asRecord,
  emailForEvent,
  eventIdFor,
  periodEndFor,
  statusForEvent,
  subscriptionIdsFor,
} from "../lib/access/billing";

describe("Polar webhook interpretation", () => {
  it("grants access only on an explicit active signal", () => {
    expect(statusForEvent("subscription.active", { status: "active" })).toBe("active");
    expect(statusForEvent("subscription.updated", { status: "trialing" })).toBe("active");
    expect(statusForEvent("subscription.created", {})).toBe("active");
  });

  it("maps the non-active lifecycle states", () => {
    expect(statusForEvent("subscription.past_due", {})).toBe("past_due");
    expect(statusForEvent("subscription.updated", { status: "unpaid" })).toBe("past_due");
    expect(statusForEvent("subscription.revoked", { status: "active" })).toBe("canceled");
    expect(statusForEvent("subscription.updated", { status: "canceled" })).toBe("canceled");
    expect(statusForEvent("subscription.created", { status: "incomplete" })).toBe("pending");
  });

  it("stays silent on events that say nothing about access", () => {
    expect(statusForEvent("checkout.created", {})).toBeNull();
    expect(statusForEvent("product.updated", { status: "published" })).toBeNull();
    expect(statusForEvent("unknown", { status: 42 })).toBeNull();
  });

  it("never infers active from a revoked event that still carries an active status", () => {
    // Polar can send the pre-revocation object on a revoked event; the event
    // type has to win, or a cancelled member keeps access.
    expect(statusForEvent("subscription.revoked", { status: "active" })).not.toBe("active");
  });

  it("finds and normalises the subscriber email across payload shapes", () => {
    expect(emailForEvent({ metadata: { email: "  Player@Example.COM " } })).toBe(
      "player@example.com",
    );
    expect(emailForEvent({ customerEmail: "a@b.co" })).toBe("a@b.co");
    expect(emailForEvent({ customer_email: "c@d.co" })).toBe("c@d.co");
    expect(emailForEvent({ customer: { email: "e@f.co" } })).toBe("e@f.co");
    expect(emailForEvent({})).toBeNull();
  });

  it("prefers metadata over the customer record when both are present", () => {
    expect(
      emailForEvent({ metadata: { email: "chosen@x.co" }, customer: { email: "other@x.co" } }),
    ).toBe("chosen@x.co");
  });

  it("derives a stable idempotency key", () => {
    expect(eventIdFor("wh_1", { id: "evt_1", type: "t" }, { id: "sub_1" })).toBe("wh_1");
    expect(eventIdFor(null, { id: "evt_1", type: "t" }, { id: "sub_1" })).toBe("evt_1");
    expect(eventIdFor(null, { type: "subscription.active" }, { id: "sub_1" })).toBe(
      "subscription.active:sub_1",
    );
    expect(eventIdFor(null, {}, {})).toBe("unknown:unidentified");
  });

  it("parses period ends and rejects junk", () => {
    expect(periodEndFor({ currentPeriodEnd: "2026-08-01T00:00:00.000Z" })).toBe(
      Date.parse("2026-08-01T00:00:00.000Z"),
    );
    expect(periodEndFor({ current_period_end: "2026-08-01T00:00:00.000Z" })).toBeTypeOf("number");
    expect(periodEndFor({ currentPeriodEnd: "not-a-date" })).toBeNull();
    expect(periodEndFor({})).toBeNull();
  });

  it("collects Polar identifiers without inventing them", () => {
    expect(subscriptionIdsFor({ id: "sub_1", customerId: "cus_1" })).toEqual({
      subscriptionId: "sub_1",
      customerId: "cus_1",
    });
    expect(subscriptionIdsFor({ customer: { id: "cus_2" } })).toEqual({
      subscriptionId: null,
      customerId: "cus_2",
    });
  });

  it("treats non-objects as empty records", () => {
    expect(asRecord(null)).toEqual({});
    expect(asRecord("string")).toEqual({});
    expect(asRecord([1, 2])).toEqual({});
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
  });
});
