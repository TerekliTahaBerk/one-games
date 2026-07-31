import { describe, expect, it, vi } from "vitest";
import { createRestDatabase, d1RestUrl, type RestConfig } from "../lib/access/db";

/** The shape the D1 client calls `fetch` with, kept explicit so the mock's
 *  recorded calls stay typed. */
type Call = { method?: string; headers?: Record<string, string>; body?: string };

function stubFetch(payload: unknown, init: { status?: number } = {}) {
  // Parameters are declared (not used) so `mock.calls` stays typed.
  return vi.fn(
    async (url: string, request: Call) =>
      new Response(JSON.stringify({ url, method: request.method, ...(payload as object) }), {
        status: init.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
  );
}

function config(fetchImpl: typeof fetch): RestConfig {
  return {
    accountId: "acc_1",
    databaseId: "db_1",
    apiToken: "token_1",
    fetchImpl,
  };
}

const OK = { success: true, result: [{ results: [{ email: "player@example.com" }] }] };

describe("D1 over HTTP", () => {
  it("targets the account's database query endpoint", () => {
    expect(d1RestUrl({ accountId: "acc_1", databaseId: "db_1" })).toBe(
      "https://api.cloudflare.com/client/v4/accounts/acc_1/d1/database/db_1/query",
    );
  });

  it("sends the SQL, the bound parameters, and the bearer token", async () => {
    const fetchImpl = stubFetch(OK);
    const db = createRestDatabase(config(fetchImpl as unknown as typeof fetch));

    await db.prepare("SELECT email FROM access_sessions WHERE token_hash = ?").bind("hash").first();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain("/accounts/acc_1/d1/database/db_1/query");
    expect(init.method).toBe("POST");
    expect(init.headers?.authorization).toBe("Bearer token_1");
    expect(JSON.parse(init.body ?? "{}")).toEqual({
      sql: "SELECT email FROM access_sessions WHERE token_hash = ?",
      params: ["hash"],
    });
  });

  it("returns the first row, or null when there are none", async () => {
    const found = createRestDatabase(config(stubFetch(OK) as unknown as typeof fetch));
    expect(await found.prepare("SELECT 1").first()).toEqual({ email: "player@example.com" });

    const empty = createRestDatabase(
      config(stubFetch({ success: true, result: [{ results: [] }] }) as unknown as typeof fetch),
    );
    expect(await empty.prepare("SELECT 1").first()).toBeNull();
  });

  it("does not mutate the statement when binding, so it can be reused", async () => {
    const fetchImpl = stubFetch(OK);
    const db = createRestDatabase(config(fetchImpl as unknown as typeof fetch));

    const statement = db.prepare("SELECT ?");
    await statement.bind("a").first();
    await statement.bind("b").first();

    const bodies = fetchImpl.mock.calls.map((call) => JSON.parse(call[1].body ?? "{}").params);
    expect(bodies).toEqual([["a"], ["b"]]);
  });

  it("throws on a transport failure rather than reporting an empty result", async () => {
    const db = createRestDatabase(
      config(stubFetch({ success: false }, { status: 500 }) as unknown as typeof fetch),
    );
    await expect(db.prepare("SELECT 1").first()).rejects.toThrow(/D1 request failed/);
  });

  it("surfaces the Cloudflare error message", async () => {
    const db = createRestDatabase(
      config(
        stubFetch({
          success: false,
          errors: [{ code: 7502, message: "no such table: subscriptions" }],
        }) as unknown as typeof fetch,
      ),
    );
    await expect(db.prepare("SELECT 1").first()).rejects.toThrow(/no such table: subscriptions/);
  });

  it("runs a batch in order", async () => {
    const fetchImpl = stubFetch(OK);
    const db = createRestDatabase(config(fetchImpl as unknown as typeof fetch));

    await db.batch([
      db.prepare("UPDATE a SET x = ?").bind(1),
      db.prepare("INSERT INTO b VALUES (?)").bind(2),
    ]);

    const sql = fetchImpl.mock.calls.map((call) => JSON.parse(call[1].body ?? "{}").sql);
    expect(sql).toEqual(["UPDATE a SET x = ?", "INSERT INTO b VALUES (?)"]);
  });
});
