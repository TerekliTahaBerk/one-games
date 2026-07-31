/**
 * Access storage.
 *
 * The same SQL runs on every host OneGames can be deployed to. Three ways in,
 * tried in order:
 *
 * 1. A native D1 binding — Cloudflare Workers / the Sites deployment.
 * 2. Postgres, when `POSTGRES_URL` (or `PRISMA_DATABASE_URL`) is set. This is
 *    the path Vercel uses.
 * 3. Cloudflare's D1 HTTP API — any Node host, when `CLOUDFLARE_ACCOUNT_ID`,
 *    `CLOUDFLARE_D1_DATABASE_ID`, and `CLOUDFLARE_API_TOKEN` are set.
 * 4. Nothing. `getDatabase()` resolves to `null`, and every caller reports that
 *    the feature is unavailable rather than pretending it worked. The marketing
 *    pages and the "Test this game" path never touch storage, so they keep
 *    working on a host with no database at all.
 */

export type Row = Record<string, unknown>;

/** The slice of the D1 surface OneGames actually uses. */
export interface AccessStatement {
  bind(...values: unknown[]): AccessStatement;
  first<T = Row>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface AccessDatabase {
  prepare(sql: string): AccessStatement;
  batch(statements: AccessStatement[]): Promise<unknown>;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS players (
    email TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    verified_at INTEGER,
    last_seen_at INTEGER,
    code_requests INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    consumed_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_verification_codes_email_created
    ON verification_codes(email, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    email TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    polar_checkout_id TEXT,
    polar_customer_id TEXT,
    polar_subscription_id TEXT,
    current_period_end INTEGER,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS access_sessions (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_access_sessions_email
    ON access_sessions(email)`,
  `CREATE TABLE IF NOT EXISTS billing_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    email TEXT,
    processed_at INTEGER NOT NULL
  )`,
] as const;

/* -------------------------------------------------------------------------- */
/* Cloudflare D1 over HTTP                                                     */
/* -------------------------------------------------------------------------- */

export type RestConfig = {
  accountId: string;
  databaseId: string;
  apiToken: string;
  fetchImpl?: typeof fetch;
};

type D1RestResponse = {
  success?: boolean;
  errors?: { code?: number; message?: string }[];
  result?: { results?: Row[] }[];
};

export function d1RestUrl({ accountId, databaseId }: Pick<RestConfig, "accountId" | "databaseId">) {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
}

class RestStatement implements AccessStatement {
  constructor(
    private readonly config: RestConfig,
    private readonly sql: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...values: unknown[]): AccessStatement {
    return new RestStatement(this.config, this.sql, values);
  }

  async first<T = Row>(): Promise<T | null> {
    const rows = await this.query();
    return (rows[0] as T | undefined) ?? null;
  }

  async run(): Promise<unknown> {
    await this.query();
    return { success: true };
  }

  private async query(): Promise<Row[]> {
    const call = this.config.fetchImpl ?? fetch;
    const response = await call(d1RestUrl(this.config), {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.apiToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ sql: this.sql, params: this.params }),
    });

    const payload = (await response.json().catch(() => ({}))) as D1RestResponse;
    if (!response.ok || payload.success === false) {
      const reason =
        payload.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
        `HTTP ${response.status}`;
      throw new Error(`D1 request failed: ${reason}`);
    }
    return payload.result?.[0]?.results ?? [];
  }
}

export function createRestDatabase(config: RestConfig): AccessDatabase {
  return {
    prepare: (sql: string) => new RestStatement(config, sql),
    // D1's HTTP API has no transactional batch, so statements run in order.
    // Every batch here is idempotent or guarded by a uniqueness constraint.
    batch: async (statements: AccessStatement[]) => {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    },
  };
}

function restConfigFromEnv(): RestConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !databaseId || !apiToken) return null;
  return { accountId, databaseId, apiToken };
}

/* -------------------------------------------------------------------------- */
/* Native Cloudflare binding                                                   */
/* -------------------------------------------------------------------------- */

// Assembled at runtime so no bundler treats `cloudflare:workers` as a hard
// dependency. On workerd the import resolves; everywhere else it throws and we
// fall through to the HTTP client.
const WORKERS_MODULE = ["cloudflare", "workers"].join(":");

async function bindingDatabase(): Promise<AccessDatabase | null> {
  try {
    const workers = (await import(/* webpackIgnore: true */ /* @vite-ignore */ WORKERS_MODULE)) as {
      env?: Record<string, unknown>;
    };
    const binding = workers.env?.DB;
    return binding ? (binding as AccessDatabase) : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Postgres                                                                    */
/* -------------------------------------------------------------------------- */

/** Either name works; Prisma hands out the second one. */
function postgresUrl(): string | null {
  return (
    process.env.POSTGRES_URL?.trim() || process.env.PRISMA_DATABASE_URL?.trim() || null
  );
}

async function postgresDatabase(): Promise<AccessDatabase | null> {
  const connectionString = postgresUrl();
  if (!connectionString) return null;
  // Imported only when configured, so hosts without Postgres never load the
  // driver — the Cloudflare bundle in particular has no use for it.
  const { createPostgresDatabase } = await import("./postgres");
  return createPostgresDatabase(connectionString);
}

/* -------------------------------------------------------------------------- */
/* Resolution                                                                  */
/* -------------------------------------------------------------------------- */

let resolved: Promise<AccessDatabase | null> | null = null;

type Source = { database: AccessDatabase; kind: "d1-binding" | "postgres" | "d1-http" };

async function selectSource(): Promise<Source | null> {
  const binding = await bindingDatabase();
  if (binding) return { database: binding, kind: "d1-binding" };

  const postgres = await postgresDatabase();
  if (postgres) return { database: postgres, kind: "postgres" };

  const rest = restConfigFromEnv();
  if (rest) return { database: createRestDatabase(rest), kind: "d1-http" };

  return null;
}

async function resolveDatabase(): Promise<AccessDatabase | null> {
  const source = await selectSource();
  if (!source) return null;

  // The D1 paths create their tables on first use. Postgres is migrated ahead
  // of time by scripts/migrate-postgres.mjs, so there is nothing to bootstrap.
  if (source.kind !== "postgres") {
    for (const statement of SCHEMA) {
      await source.database.prepare(statement).run();
    }
  }
  return source.database;
}

/**
 * The configured database, or `null` when this deployment has no storage.
 * Callers must handle `null` — never assume persistence exists.
 */
export function getDatabase(): Promise<AccessDatabase | null> {
  if (!resolved) {
    resolved = resolveDatabase().catch((error) => {
      console.error("[onegames] database unavailable", error);
      // Let the next request try again rather than caching a transient failure.
      resolved = null;
      return null;
    });
  }
  return resolved;
}

/** Whether this deployment can persist verification, sessions, and billing. */
export async function hasDatabase(): Promise<boolean> {
  return (await getDatabase()) !== null;
}
