import "server-only";

import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import fs from "fs";
import path from "path";
import * as schema from "./schema";
import { INIT_SQL } from "./init-sql";
import { applyMigrations } from "./migrations";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "northstar.db");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function createDbClient(): Client {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    return createClient({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  ensureDataDir();
  return createClient({ url: `file:${DB_PATH}` });
}

async function initSchema(client: Client, db: Db) {
  if (!process.env.TURSO_DATABASE_URL) {
    await client.execute("PRAGMA busy_timeout = 5000");
  }

  try {
    await client.executeMultiple(INIT_SQL);
  } catch (err) {
    console.warn(
      "INIT_SQL executeMultiple failed; continuing with incremental migrations",
      err,
    );
  }
  await applyMigrations(client, db);

  if (!process.env.TURSO_DATABASE_URL) {
    const cols = await client.execute("PRAGMA table_info(tasks)");
    const hasManualSort = cols.rows.some(
      (row) => row.name === "manual_sort_order",
    );
    if (!hasManualSort) {
      await client.execute(
        "ALTER TABLE tasks ADD COLUMN manual_sort_order INTEGER NOT NULL DEFAULT 0",
      );
    }
  }
}

const client = createDbClient();
const db = drizzle(client, { schema });

const ready = initSchema(client, db);

export type Db = LibSQLDatabase<typeof schema>;

export function getDb(): Db {
  return db;
}

/** Await before first query when using local file fallback (no-op for Turso). */
export async function ensureDbReady() {
  await ready;
}
