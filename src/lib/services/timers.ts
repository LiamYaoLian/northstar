import { ensureDbReady, getDb } from "@/lib/db";
import { activeTimeSessions, tasks, timeEntries } from "@/lib/db/schema";
import type { Task, TimeEntry } from "@/lib/db/schema";
import { computeDurationMin } from "@/lib/timer/duration";
import { id, nowIso } from "@/lib/utils";
import { and, eq } from "drizzle-orm";
import {
  TimerAlreadyRunningError,
  TimerInvalidInputError,
  TimerNotFoundError,
  TimerTaskDeletedError,
  TimerTaskNotFoundError,
} from "@/lib/services/timer-errors";
import type {
  ActiveTimerPayload,
  ActiveTimerSession,
  TimerMode,
} from "@/lib/services/timer-types";

export type {
  ActiveTimerPayload,
  ActiveTimerSession,
  ActiveTimerTask,
  TimerMode,
} from "@/lib/services/timer-types";

type StartTimerInput = {
  taskId: string;
  mode: TimerMode;
  targetDurationMin?: number | null;
  note?: string | null;
};

function scopedSessionUser(userId: string) {
  return eq(activeTimeSessions.userId, userId);
}

async function fetchTaskSummary(
  taskId: string,
  userId: string,
): Promise<Task | null> {
  const rows = await getDb()
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  return rows[0] ?? null;
}

function toSession(row: typeof activeTimeSessions.$inferSelect): ActiveTimerSession {
  return {
    id: row.id,
    taskId: row.taskId,
    mode: row.mode as TimerMode,
    startedAt: row.startedAt,
    targetDurationMin: row.targetDurationMin,
    note: row.note,
  };
}

function toPayload(
  row: typeof activeTimeSessions.$inferSelect,
  task: Task | null,
  serverNow = nowIso(),
): ActiveTimerPayload {
  return {
    session: toSession(row),
    task: task
      ? { id: task.id, title: task.title, status: task.status }
      : null,
    serverNow,
  };
}

function validateStartInput(input: StartTimerInput) {
  if (input.mode === "stopwatch") {
    if (input.targetDurationMin != null) {
      throw new TimerInvalidInputError();
    }
    return;
  }

  if (
    input.mode !== "pomodoro" ||
    input.targetDurationMin == null ||
    input.targetDurationMin <= 0
  ) {
    throw new TimerInvalidInputError();
  }
}

export async function getActiveTimer(
  userId: string,
): Promise<ActiveTimerPayload | null> {
  await ensureDbReady();
  const rows = await getDb()
    .select()
    .from(activeTimeSessions)
    .where(scopedSessionUser(userId));
  const row = rows[0];
  if (!row) return null;

  const task = await fetchTaskSummary(row.taskId, userId);
  return toPayload(row, task);
}

export async function startTimer(
  input: StartTimerInput,
  userId: string,
): Promise<ActiveTimerPayload> {
  await ensureDbReady();
  validateStartInput(input);

  const task = await fetchTaskSummary(input.taskId, userId);
  if (!task) {
    throw new TimerTaskNotFoundError();
  }

  const existing = await getDb()
    .select()
    .from(activeTimeSessions)
    .where(scopedSessionUser(userId));
  if (existing[0]) {
    const activeTask = await fetchTaskSummary(existing[0].taskId, userId);
    throw new TimerAlreadyRunningError(
      "Timer already running",
      toPayload(existing[0], activeTask),
    );
  }

  const ts = nowIso();
  const sessionId = id();
  const row: typeof activeTimeSessions.$inferInsert = {
    id: sessionId,
    userId,
    taskId: input.taskId,
    mode: input.mode,
    startedAt: ts,
    targetDurationMin: input.mode === "pomodoro" ? input.targetDurationMin! : null,
    note: input.note ?? null,
    createdAt: ts,
    updatedAt: ts,
  };

  await getDb().insert(activeTimeSessions).values(row);
  return toPayload(
    { ...row, targetDurationMin: row.targetDurationMin ?? null },
    task,
    ts,
  );
}

export async function stopTimer(userId: string): Promise<TimeEntry> {
  await ensureDbReady();
  const db = getDb();
  const rows = await db
    .select()
    .from(activeTimeSessions)
    .where(scopedSessionUser(userId));
  const session = rows[0];
  if (!session) {
    throw new TimerNotFoundError();
  }

  const stopTs = nowIso();
  const elapsedMs =
    new Date(stopTs).getTime() - new Date(session.startedAt).getTime();
  const durationMin = computeDurationMin(elapsedMs);

  const task = await fetchTaskSummary(session.taskId, userId);
  if (!task) {
    await db
      .delete(activeTimeSessions)
      .where(eq(activeTimeSessions.id, session.id));
    throw new TimerTaskDeletedError();
  }

  const entryId = id();
  await db.transaction(async (tx) => {
    await tx.insert(timeEntries).values({
      id: entryId,
      userId,
      taskId: session.taskId,
      startedAt: session.startedAt,
      durationMin,
      source: "timer",
      note: session.note,
      createdAt: stopTs,
    });
    await tx
      .delete(activeTimeSessions)
      .where(eq(activeTimeSessions.id, session.id));
  });

  const entryRows = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, entryId), eq(timeEntries.userId, userId)));
  const entry = entryRows[0];
  if (!entry) {
    throw new Error("Failed to load timer time entry");
  }
  return entry;
}

export async function cancelTimer(userId: string): Promise<void> {
  await ensureDbReady();
  const db = getDb();
  const rows = await db
    .select()
    .from(activeTimeSessions)
    .where(scopedSessionUser(userId));
  const session = rows[0];
  if (!session) {
    throw new TimerNotFoundError();
  }

  await db
    .delete(activeTimeSessions)
    .where(eq(activeTimeSessions.id, session.id));
}
