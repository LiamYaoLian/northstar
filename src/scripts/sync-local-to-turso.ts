/**
 * One-time sync: copy all rows from local data/northstar.db into Turso.
 * Requires TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in .env.local (or env).
 *
 * Usage: npm run db:sync-turso
 */
import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import { INIT_SQL } from "../lib/db/init-sql";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "northstar.db");

const TABLES = [
  "north_stars",
  "strategic_pillars",
  "strategy_revisions",
  "tasks",
  "subtasks",
  "time_entries",
  "review_snapshots",
] as const;

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (!tursoUrl || !tursoToken) {
    console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
    process.exit(1);
  }
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Local database not found: ${DB_PATH}`);
    process.exit(1);
  }

  const local = createClient({ url: `file:${DB_PATH}` });
  const remote = createClient({ url: tursoUrl, authToken: tursoToken });

  console.log("Ensuring remote schema...");
  await remote.executeMultiple(INIT_SQL);

  for (const table of TABLES) {
    const { rows } = await local.execute(`SELECT * FROM ${table}`);
    if (rows.length === 0) {
      console.log(`  ${table}: 0 rows (skip)`);
      continue;
    }

    await remote.execute(`DELETE FROM ${table}`);
    const columns = Object.keys(rows[0] as Record<string, unknown>);
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

    for (const row of rows) {
      const values = columns.map((col) => (row as Record<string, unknown>)[col]);
      await remote.execute({ sql, args: values as (string | number | null | bigint | boolean | Uint8Array)[] });
    }
    console.log(`  ${table}: ${rows.length} rows synced`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
