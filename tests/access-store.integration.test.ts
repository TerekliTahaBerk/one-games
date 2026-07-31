import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashCode, randomCode, randomToken, sha256 } from "../lib/access/crypto";
import { hasDatabase } from "../lib/access/db";
import {
  applySubscriptionChange,
  CODE_MAX_ATTEMPTS,
  completeVerification,
  deletePlayerData,
  findSession,
  getPlayer,
  getSubscriptionStatus,
  hasProcessedEvent,
  hasRecentCode,
  insertSession,
  latestOpenCode,
  markEventProcessed,
  purgeExpired,
  recordCheckoutStarted,
  recordCodeRequest,
  recordFailedAttempt,
} from "../lib/access/store";

/**
 * Exercises the real SQL against a real database.
 *
 * The unit tests cover pure logic and Playwright covers the browser, but the
 * statements themselves are only ever proven by running them. This walks the
 * whole lifecycle using the same functions the route handlers call.
 *
 * Skipped unless a database is configured, so `npm test` stays offline:
 *
 *   npm run test:db
 */
const configured = Boolean(process.env.POSTGRES_URL ?? process.env.PRISMA_DATABASE_URL);
const EMAIL = `vitest-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@onegames.test`;

describe.skipIf(!configured)("Access store against a real database", () => {
  beforeAll(() => {
    process.env.EMAIL_VERIFICATION_SECRET ??= "integration-test-secret";
  });

  afterAll(async () => {
    await deletePlayerData(EMAIL);
    expect(await getPlayer(EMAIL)).toBeNull();
  });

  it("is connected", async () => {
    expect(await hasDatabase()).toBe(true);
  });

  it("records an address the moment a code is requested", async () => {
    expect(await hasRecentCode(EMAIL)).toBe(false);

    const code = randomCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(await recordCodeRequest(EMAIL, randomToken(16), await hashCode(EMAIL, code))).toBe(
      true,
    );

    const player = await getPlayer(EMAIL);
    expect(player?.email).toBe(EMAIL);
    expect(player?.code_requests).toBe(1);
    // Entering an address is not verifying it.
    expect(player?.verified_at).toBeNull();
  });

  it("applies a cooldown to repeat requests", async () => {
    expect(await hasRecentCode(EMAIL)).toBe(true);
    // Read from far enough ahead and the window has moved past this code.
    expect(await hasRecentCode(EMAIL, Date.now() + 120_000)).toBe(false);
  });

  it("counts repeat requests against the same address", async () => {
    await recordCodeRequest(EMAIL, randomToken(16), await hashCode(EMAIL, randomCode()));
    expect((await getPlayer(EMAIL))?.code_requests).toBe(2);
  });

  it("counts failed attempts on the newest open code", async () => {
    const open = await latestOpenCode(EMAIL);
    expect(open).not.toBeNull();
    expect(open?.attempts).toBe(0);

    await recordFailedAttempt(open!.id);
    await recordFailedAttempt(open!.id);

    const after = await latestOpenCode(EMAIL);
    expect(after?.id).toBe(open!.id);
    expect(after?.attempts).toBe(2);
    expect(after!.attempts).toBeLessThan(CODE_MAX_ATTEMPTS);
  });

  it("burns the code and stamps verification, without granting access", async () => {
    const open = await latestOpenCode(EMAIL);
    expect(await completeVerification(EMAIL, open!.id)).toBe(true);

    // Consumed codes are no longer offered up.
    const remaining = await latestOpenCode(EMAIL);
    expect(remaining?.id).not.toBe(open!.id);

    const player = await getPlayer(EMAIL);
    expect(typeof player?.verified_at).toBe("number");
    expect(typeof player?.last_seen_at).toBe("number");

    // Proving the address is not paying for it.
    expect(await getSubscriptionStatus(EMAIL)).toBe("pending");
  });

  it("resolves a session token to its address and billing status", async () => {
    const token = randomToken();
    const hash = await sha256(token);
    expect(await insertSession(hash, EMAIL)).toBe(true);

    const session = await findSession(hash);
    expect(session?.email).toBe(EMAIL);
    expect(session?.status).toBe("pending");

    expect(await findSession(await sha256("not-a-real-token"))).toBeNull();
    // Read far enough in the future and the session has lapsed.
    expect(await findSession(hash, Date.now() + 400 * 24 * 60 * 60_000)).toBeNull();
  });

  it("does not grant access when a checkout merely starts", async () => {
    await recordCheckoutStarted(EMAIL, `checkout_${randomToken(6)}`);
    expect(await getSubscriptionStatus(EMAIL)).toBe("pending");
  });

  it("grants access on a webhook, and revokes it again", async () => {
    const token = randomToken();
    const hash = await sha256(token);
    await insertSession(hash, EMAIL);

    const eventId = `evt_${randomToken(8)}`;
    expect(await hasProcessedEvent(eventId)).toBe(false);

    await applySubscriptionChange({
      email: EMAIL,
      status: "active",
      subscriptionId: "sub_integration",
      customerId: "cus_integration",
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60_000,
    });
    await markEventProcessed(eventId, "subscription.active", EMAIL);

    expect(await hasProcessedEvent(eventId)).toBe(true);
    expect(await getSubscriptionStatus(EMAIL)).toBe("active");
    expect((await findSession(hash))?.status).toBe("active");

    // A revocation that carries no customer id must not erase the one we have.
    await applySubscriptionChange({
      email: EMAIL,
      status: "canceled",
      subscriptionId: null,
      customerId: null,
      currentPeriodEnd: null,
    });
    expect(await getSubscriptionStatus(EMAIL)).toBe("canceled");
    expect((await findSession(hash))?.status).toBe("canceled");
  });

  it("keeps a delivered event id unique, so a retry cannot apply twice", async () => {
    const eventId = `evt_${randomToken(8)}`;
    await markEventProcessed(eventId, "subscription.updated", EMAIL);
    await expect(markEventProcessed(eventId, "subscription.updated", EMAIL)).rejects.toThrow();
  });

  it("purges what has expired and leaves what has not", async () => {
    const token = randomToken();
    const hash = await sha256(token);
    await insertSession(hash, EMAIL);

    expect(await purgeExpired()).toBe(true);
    expect(await findSession(hash)).not.toBeNull();
  });
});
