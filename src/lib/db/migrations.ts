import type { Client } from "@libsql/client";
import { sql } from "drizzle-orm";
import { type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import path from "path";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

const migrationsFolder = path.join(process.cwd(), "drizzle");

async function stampMigration(db: Db, hash: string, createdAt: number) {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text NOT NULL,
      created_at numeric
    )
  `);

  const existing = await db.values(
    sql`SELECT id FROM __drizzle_migrations WHERE hash = ${hash}`,
  );
  if (existing.length > 0) return;

  await db.run(
    sql`INSERT INTO __drizzle_migrations ("hash", "created_at") VALUES(${hash}, ${createdAt})`,
  );
}

export async function applyMigrations(client: Client, db: Db) {
  const cols = await client.execute("PRAGMA table_info(tasks)");
  const hasIsPinned = cols.rows.some((row) => row.name === "is_pinned");

  if (hasIsPinned) {
    await migrate(db, { migrationsFolder });
    return;
  }

  const [dropMigration] = readMigrationFiles({ migrationsFolder });
  if (!dropMigration) return;

  await stampMigration(db, dropMigration.hash, dropMigration.folderMillis);
}
