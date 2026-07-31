import { Pool, types, type PoolClient } from "pg";
import type { AccessDatabase, AccessStatement, Row } from "./db";

/**
 * Postgres implementation of the access storage interface.
 *
 * The rest of the app writes D1-flavoured SQL — `?` placeholders, epoch
 * milliseconds — so this adapter translates placeholders and leaves everything
 * else alone. That keeps one set of queries serving both deploy targets rather
 * than forking the data layer per host.
 */

// int8 comes back as a string by default, to avoid silently truncating values
// beyond 2^53. Every BIGINT here is an epoch millisecond, which stays well
// inside that range for the next 285,000 years, so reading them as numbers is
// safe and spares every call site a parseInt.
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

/**
 * Rewrites `?` placeholders as `$1…$n`, skipping anything inside a quoted
 * string so a literal question mark in SQL text is never renumbered.
 */
export function toPositionalParameters(sql: string): string {
  let output = "";
  let index = 0;
  let quote: string | null = null;

  for (let position = 0; position < sql.length; position += 1) {
    const character = sql[position];

    if (quote) {
      output += character;
      // Doubled quotes are an escaped quote, not the end of the literal.
      if (character === quote && sql[position + 1] === quote) {
        output += sql[position + 1];
        position += 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      output += character;
      continue;
    }

    if (character === "?") {
      index += 1;
      output += `$${index}`;
      continue;
    }

    output += character;
  }

  return output;
}

type Runner = { query(text: string, values: unknown[]): Promise<{ rows: Row[] }> };

class PostgresStatement implements AccessStatement {
  constructor(
    private readonly runner: () => Runner,
    private readonly sql: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...values: unknown[]): AccessStatement {
    // Returns a new statement so a prepared statement can be reused.
    return new PostgresStatement(this.runner, this.sql, values);
  }

  async first<T = Row>(): Promise<T | null> {
    const { rows } = await this.execute();
    return (rows[0] as T | undefined) ?? null;
  }

  async run(): Promise<unknown> {
    await this.execute();
    return { success: true };
  }

  /** Used by `batch` so every statement lands on the same transaction. */
  async executeOn(client: Runner): Promise<void> {
    await client.query(toPositionalParameters(this.sql), this.params);
  }

  private execute() {
    return this.runner().query(toPositionalParameters(this.sql), this.params);
  }
}

/**
 * Strips `sslmode` from the URL. TLS is configured explicitly below, and `pg`
 * warns that it is about to reinterpret `sslmode=require` with weaker libpq
 * semantics — so the setting is better stated in code than in the string.
 */
export function withoutSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("uselibpqcompat");
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function createPostgresDatabase(connectionString: string): AccessDatabase {
  const pool = new Pool({
    connectionString: withoutSslMode(connectionString),
    // Prisma Postgres terminates plain connections, and its certificate chain
    // is publicly valid, so verify it rather than disabling the check.
    ssl: { rejectUnauthorized: true },
    // Serverless invocations are short-lived and numerous; a small ceiling
    // keeps one deployment from exhausting the database's connection budget.
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  // A pool error on an idle client must not take the process down.
  pool.on("error", (error) => {
    console.error("[onegames] postgres pool error", error);
  });

  const database: AccessDatabase = {
    prepare: (sql: string) => new PostgresStatement(() => pool, sql),

    // Unlike the D1 HTTP client, Postgres gives us a real transaction — so a
    // batch either lands completely or not at all.
    batch: async (statements: AccessStatement[]) => {
      const client: PoolClient = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const statement of statements) {
          await (statement as PostgresStatement).executeOn(client);
        }
        await client.query("COMMIT");
        return statements.map(() => ({ success: true }));
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };

  return database;
}
