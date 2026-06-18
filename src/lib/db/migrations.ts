import type { Client } from "@libsql/client";
import { type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

const migrationsFolder = path.join(process.cwd(), "drizzle");

export async function safeDropIsPinnedIfExists(client: Client): Promise<void> {
  const cols = await client.execute("PRAGMA table_info(tasks)");
  const hasIsPinned = cols.rows.some((row) => row.name === "is_pinned");
  if (hasIsPinned) {
    await client.execute("ALTER TABLE tasks DROP COLUMN is_pinned");
  }
}

export async function dropIsEntryPointIfExists(client: Client): Promise<void> {
  const cols = await client.execute("PRAGMA table_info(subtasks)");
  const hasIsEntryPoint = cols.rows.some((row) => row.name === "is_entry_point");
  if (hasIsEntryPoint) {
    await client.execute("ALTER TABLE subtasks DROP COLUMN is_entry_point");
  }
}

export async function addRecurrenceColumnsIfMissing(
  client: Client,
): Promise<void> {
  const cols = await client.execute("PRAGMA table_info(tasks)");
  const names = new Set(cols.rows.map((row) => String(row.name)));

  if (!names.has("recurrence_type")) {
    await client.execute(
      "ALTER TABLE tasks ADD COLUMN recurrence_type TEXT NOT NULL DEFAULT 'none'",
    );
  }
  if (!names.has("recurrence_days")) {
    await client.execute("ALTER TABLE tasks ADD COLUMN recurrence_days TEXT");
  }
  if (!names.has("recurrence_carry_over")) {
    await client.execute(
      "ALTER TABLE tasks ADD COLUMN recurrence_carry_over INTEGER NOT NULL DEFAULT 0",
    );
  }
}

export async function applyMigrations(client: Client, db: Db) {
  await safeDropIsPinnedIfExists(client);
  await dropIsEntryPointIfExists(client);
  await migrate(db, { migrationsFolder });
  await addRecurrenceColumnsIfMissing(client);
}
