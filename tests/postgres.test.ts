import { describe, expect, it } from "vitest";
import { toPositionalParameters, withoutSslMode } from "../lib/access/postgres";

describe("Placeholder translation", () => {
  it("numbers placeholders in order", () => {
    expect(toPositionalParameters("SELECT * FROM t WHERE a = ? AND b = ?")).toBe(
      "SELECT * FROM t WHERE a = $1 AND b = $2",
    );
  });

  it("leaves SQL without placeholders alone", () => {
    expect(toPositionalParameters("SELECT 1")).toBe("SELECT 1");
  });

  it("does not renumber a question mark inside a string literal", () => {
    expect(toPositionalParameters("SELECT ? WHERE note = 'why? really'")).toBe(
      "SELECT $1 WHERE note = 'why? really'",
    );
  });

  it("handles an escaped quote inside a literal", () => {
    expect(toPositionalParameters("SELECT ? WHERE a = 'it''s ok?' AND b = ?")).toBe(
      "SELECT $1 WHERE a = 'it''s ok?' AND b = $2",
    );
  });

  it("respects double-quoted identifiers", () => {
    expect(toPositionalParameters('SELECT "od?d" FROM t WHERE a = ?')).toBe(
      'SELECT "od?d" FROM t WHERE a = $1',
    );
  });

  it("translates the statements the app actually runs", () => {
    expect(
      toPositionalParameters(
        `INSERT INTO players (email, created_at, code_requests)
         VALUES (?, ?, 1)
         ON CONFLICT(email) DO UPDATE SET code_requests = players.code_requests + 1`,
      ),
    ).toContain("VALUES ($1, $2, 1)");

    const upsert = toPositionalParameters(
      `INSERT INTO subscriptions
        (email, status, polar_customer_id, polar_subscription_id, current_period_end, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    expect(upsert).toContain("VALUES ($1, $2, $3, $4, $5, $6)");
    expect(upsert).not.toContain("?");
  });
});

describe("Connection string handling", () => {
  it("drops sslmode, which pg is about to reinterpret", () => {
    expect(withoutSslMode("postgres://u:p@host:5432/db?sslmode=require")).toBe(
      "postgres://u:p@host:5432/db",
    );
  });

  it("keeps every other parameter", () => {
    const result = withoutSslMode(
      "postgres://u:p@host:5432/db?sslmode=require&application_name=onegames",
    );
    expect(result).toContain("application_name=onegames");
    expect(result).not.toContain("sslmode");
  });

  it("leaves a string it cannot parse untouched", () => {
    expect(withoutSslMode("not a url")).toBe("not a url");
  });
});
