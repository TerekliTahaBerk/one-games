/**
 * Applies db/postgres/*.sql to the configured Postgres database, in order.
 *
 * Every migration is idempotent (`IF NOT EXISTS`) and each one runs inside a
 * transaction, so a partial file can never land. Applied filenames are recorded
 * in `schema_migrations` so re-running is a no-op.
 *
 *   node --env-file=.env.local scripts/migrate-postgres.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIRECTORY = resolve(ROOT, "db/postgres");

const connectionString = process.env.POSTGRES_URL ?? process.env.PRISMA_DATABASE_URL;
if (!connectionString) {
  console.error("Set POSTGRES_URL (or PRISMA_DATABASE_URL) before migrating.");
  process.exit(1);
}

// TLS is stated here rather than via sslmode, whose meaning pg is changing.
const url = new URL(connectionString);
url.searchParams.delete("sslmode");
const client = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
});
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name        TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

const applied = new Set(
  (await client.query("SELECT name FROM schema_migrations")).rows.map((row) => row.name),
);

const files = (await readdir(DIRECTORY)).filter((name) => name.endsWith(".sql")).sort();
let ran = 0;

for (const file of files) {
  if (applied.has(file)) {
    console.log(`· ${file} (already applied)`);
    continue;
  }
  const sql = await readFile(resolve(DIRECTORY, file), "utf8");
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log(`✓ ${file}`);
    ran += 1;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`✗ ${file}: ${error.message}`);
    await client.end();
    process.exit(1);
  }
}

const tables = await client.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1",
);
console.log(`\n${ran} migration(s) applied. Tables: ${tables.rows.map((r) => r.table_name).join(", ")}`);

await client.end();
