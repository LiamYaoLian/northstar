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

const { tasks, taskCompletionEvents, strategicPillars, users } = schema;

type Db = LibSQLDatabase<typeof schema>;

const migrationsFolder = path.join(process.cwd(), "drizzle");
const LEGACY_USER_EMAIL =
  process.env.NORTHSTAR_DEFAULT_USER_EMAIL ?? "local@northstar.dev";

async function tableColumnNames(client: Client, table: string): Promise<Set<string>> {
  const cols = await client.execute(`PRAGMA table_info(${table})`);
  return new Set(cols.rows.map((row) => String(row.name)));
}

async function addColumnIfMissing(
  client: Client,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const names = await tableColumnNames(client, table);
  if (!names.has(column)) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export async function addAuthTablesIfMissing(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      email_verified INTEGER,
      image TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      PRIMARY KEY (provider, provider_account_id)
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires INTEGER NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires INTEGER NOT NULL,
      PRIMARY KEY (identifier, token)
    )
  `);
  await client.execute("CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts (user_id)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)");
}

export async function addBusinessUserColumnsIfMissing(
  client: Client,
): Promise<void> {
  const tables = [
    "north_stars",
    "strategic_pillars",
    "strategy_revisions",
    "tasks",
    "subtasks",
    "time_entries",
    "task_completion_events",
    "review_snapshots",
  ];
  for (const table of tables) {
    await addColumnIfMissing(client, table, "user_id", "TEXT");
  }
}

export async function createOrGetLegacyUser(db: Db): Promise<string> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, LEGACY_USER_EMAIL))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const ts = nowIso();
  const userId = id();
  await db.insert(users).values({
    id: userId,
    name: "Local Northstar User",
    email: LEGACY_USER_EMAIL,
    emailVerified: null,
    image: null,
    createdAt: ts,
    updatedAt: ts,
  });
  return userId;
}

export async function backfillLegacyUserIds(
  client: Client,
  db: Db,
): Promise<void> {
  const userId = await createOrGetLegacyUser(db);
  const tables = [
    "north_stars",
    "strategic_pillars",
    "strategy_revisions",
    "tasks",
    "subtasks",
    "time_entries",
    "task_completion_events",
    "review_snapshots",
  ];
  for (const table of tables) {
    await client.execute({
      sql: `UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`,
      args: [userId],
    });
  }
}

export async function addUserScopedIndexes(client: Client): Promise<void> {
  await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_north_stars_user_id ON north_stars (user_id)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_pillars_user_sort ON strategic_pillars (user_id, sort_order)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_strategy_revisions_user_created ON strategy_revisions (user_id, created_at)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks (user_id, status)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_tasks_user_manual_sort ON tasks (user_id, manual_sort_order)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_subtasks_user_parent ON subtasks (user_id, parent_task_id)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_time_entries_user_started_at ON time_entries (user_id, started_at)");
  await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_completion_events_user_task_completed ON task_completion_events (user_id, task_id, completed_at)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_completion_events_user_occurrence ON task_completion_events (user_id, occurrence_date)");
  await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_review_snapshots_user_period ON review_snapshots (user_id, period_start, period_end)");
}

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

export async function addSubtaskEstimatedMinColumnIfMissing(
  client: Client,
): Promise<void> {
  await addColumnIfMissing(client, "subtasks", "estimated_min", "INTEGER");
}

export async function addTaskStartAtColumnIfMissing(client: Client): Promise<void> {
  await addColumnIfMissing(client, "tasks", "start_at", "TEXT");
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
      user_id TEXT,
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
    CREATE INDEX IF NOT EXISTS idx_completion_events_user_occurrence
    ON task_completion_events (user_id, occurrence_date DESC)
  `);
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_completion_events_user_task_completed
    ON task_completion_events (user_id, task_id, completed_at DESC)
  `);
}

/** One-time style backfill: done tasks without a matching completion event. */
export async function backfillCompletionEventsIfMissing(
  db: Db,
  tz = DEFAULT_TIMEZONE,
): Promise<void> {
  const doneTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.status, "done"));
  if (doneTasks.length === 0) return;

  const existing = await db.select().from(taskCompletionEvents);
  const existingKeys = new Set(
    existing.map((row) => `${row.userId}:${row.taskId}:${row.completedAt}`),
  );

  for (const task of doneTasks) {
    if (!task.completedAt) continue;
    const key = `${task.userId}:${task.id}:${task.completedAt}`;
    if (existingKeys.has(key)) continue;

    const pillars = task.userId
      ? await db
          .select()
          .from(strategicPillars)
          .where(eq(strategicPillars.userId, task.userId))
      : await db.select().from(strategicPillars);
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
      userId: task.userId,
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

export async function addActiveTimeSessionsTableIfMissing(
  client: Client,
): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS active_time_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      started_at TEXT NOT NULL,
      target_duration_min INTEGER,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_active_time_sessions_user
    ON active_time_sessions (user_id)
  `);
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
    "SELECT id, user_id, task_id, completed_at FROM task_completion_events ORDER BY user_id, task_id, completed_at, id",
  );
  const seen = new Set<string>();
  const deleteIds: string[] = [];
  for (const row of rows.rows) {
    const key = `${String(row.user_id)}:${String(row.task_id)}:${String(row.completed_at)}`;
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
  await addAuthTablesIfMissing(client);
  await safeDropIsPinnedIfExists(client);
  await dropIsEntryPointIfExists(client);
  await removeDeferFeatureIfPresent(client);
  await migrate(db, { migrationsFolder });
  await addBusinessUserColumnsIfMissing(client);
  await backfillLegacyUserIds(client, db);
  await addRecurrenceColumnsIfMissing(client);
  await addSubtaskEstimatedMinColumnIfMissing(client);
  await addTaskStartAtColumnIfMissing(client);
  await addCompletionEventsTableIfMissing(client);
  await addActiveTimeSessionsTableIfMissing(client);
  await dedupeCompletionEvents(client);
  await backfillCompletionEventsIfMissing(db);
  await dedupeCompletionEvents(client);
  await addUserScopedIndexes(client);
}
