import type { Client } from "@libsql/client";
import { type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import path from "path";
import * as schema from "./schema";
import {
  buildCompletionEventPayload,
  resolvePillarSnapshotForCompletion,
} from "@/lib/tasks/completion-events";
import { DEFAULT_TIMEZONE } from "@/lib/tasks/timezone";
import { id, nowIso } from "@/lib/utils";

const { tasks, taskCompletionEvents, strategicPillars } = schema;

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

export async function addCompletionEventsTableIfMissing(
  client: Client,
): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS task_completion_events (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      occurrence_date TEXT NOT NULL,
      task_title TEXT NOT NULL,
      pillar_id TEXT,
      pillar_name TEXT,
      pillar_color TEXT,
      focus_track TEXT,
      recurrence_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_completion_events_occurrence_date
    ON task_completion_events (occurrence_date DESC)
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_completion_events_pillar_occurrence
    ON task_completion_events (pillar_id, occurrence_date DESC)
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_completion_events_task_completed
    ON task_completion_events (task_id, completed_at DESC)
  `);
}

/** One-time style backfill: done tasks without a matching completion event. */
export async function backfillCompletionEventsIfMissing(
  db: Db,
  tz = DEFAULT_TIMEZONE,
): Promise<void> {
  const pillars = await db.select().from(strategicPillars);
  const doneTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.status, "done"));
  if (doneTasks.length === 0) return;

  const existing = await db.select().from(taskCompletionEvents);
  const existingKeys = new Set(
    existing.map((row) => `${row.taskId}:${row.completedAt}`),
  );

  for (const task of doneTasks) {
    if (!task.completedAt) continue;
    const key = `${task.id}:${task.completedAt}`;
    if (existingKeys.has(key)) continue;

    const snapshot = resolvePillarSnapshotForCompletion(task, pillars);
    const completedAt = new Date(task.completedAt);
    const payload = buildCompletionEventPayload(
      task,
      tz,
      completedAt,
      snapshot,
      id(),
      nowIso(),
    );

    await db.insert(taskCompletionEvents).values({
      id: payload.id,
      taskId: payload.taskId,
      completedAt: payload.completedAt,
      occurrenceDate: payload.occurrenceDate,
      taskTitle: payload.taskTitle,
      pillarId: payload.pillarId,
      pillarName: payload.pillarName,
      pillarColor: payload.pillarColor,
      focusTrack: payload.focusTrack,
      recurrenceType: payload.recurrenceType,
      createdAt: payload.createdAt,
    });
    existingKeys.add(key);
  }
}

/** Remove duplicate rows sharing the same task_id + completed_at. */
export async function removeDeferFeatureIfPresent(client: Client): Promise<void> {
  await client.execute("UPDATE tasks SET status = 'todo' WHERE status = 'deferred'");

  const cols = await client.execute("PRAGMA table_info(tasks)");
  const hasPostponedCount = cols.rows.some((row) => row.name === "postponed_count");
  if (hasPostponedCount) {
    await client.execute("ALTER TABLE tasks DROP COLUMN postponed_count");
  }
}

export async function dedupeCompletionEvents(client: Client): Promise<number> {
  const rows = await client.execute(
    "SELECT id, task_id, completed_at FROM task_completion_events ORDER BY task_id, completed_at, id",
  );
  const seen = new Set<string>();
  const deleteIds: string[] = [];
  for (const row of rows.rows) {
    const key = `${String(row.task_id)}:${String(row.completed_at)}`;
    if (seen.has(key)) {
      deleteIds.push(String(row.id));
    } else {
      seen.add(key);
    }
  }
  for (const eventId of deleteIds) {
    await client.execute({
      sql: "DELETE FROM task_completion_events WHERE id = ?",
      args: [eventId],
    });
  }
  return deleteIds.length;
}

export async function applyMigrations(client: Client, db: Db) {
  await safeDropIsPinnedIfExists(client);
  await dropIsEntryPointIfExists(client);
  await removeDeferFeatureIfPresent(client);
  await migrate(db, { migrationsFolder });
  await addRecurrenceColumnsIfMissing(client);
  await addCompletionEventsTableIfMissing(client);
  await dedupeCompletionEvents(client);
  await backfillCompletionEventsIfMissing(db);
  await dedupeCompletionEvents(client);
}
