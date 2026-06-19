import "server-only";

import { getDb, ensureDbReady } from "@/lib/db";
import { strategicPillars, taskCompletionEvents } from "@/lib/db/schema";
import type { Task } from "@/lib/db/schema";
import type { Db } from "@/lib/db";
import {
  buildCompletionEventPayload,
  filterCompletionEvents,
  resolvePillarSnapshotForCompletion,
  summarizeCompletionEventsByPillar,
  type TaskCompletionEvent,
} from "@/lib/tasks/completion-events";
import { id, nowIso } from "@/lib/utils";
import { and, desc, gte, lte, eq, isNull } from "drizzle-orm";

export type ListCompletionEventsQuery = {
  since: string;
  until: string;
  pillarId?: string | null;
  tz: string;
  limit?: number;
  userId: string;
};

export type CompletionSummary = {
  pillarId: string | null;
  count: number;
  topTitles: string[];
};

function rowToEvent(row: typeof taskCompletionEvents.$inferSelect): TaskCompletionEvent {
  return {
    id: row.id,
    taskId: row.taskId,
    completedAt: row.completedAt,
    occurrenceDate: row.occurrenceDate,
    taskTitle: row.taskTitle,
    pillarId: row.pillarId,
    pillarName: row.pillarName,
    pillarColor: row.pillarColor,
    focusTrack: row.focusTrack,
    recurrenceType: row.recurrenceType as TaskCompletionEvent["recurrenceType"],
    createdAt: row.createdAt,
  };
}

type DbWriter = Pick<Db, "insert" | "select">;
type DbCompletionDeleter = Pick<Db, "delete">;

export async function recordCompletionEvent(
  tx: DbWriter,
  userId: string,
  task: Task,
  tz: string,
  now = new Date(),
): Promise<TaskCompletionEvent> {
  const completedAtIso = task.completedAt ?? now.toISOString();

  const existing = await tx
    .select()
    .from(taskCompletionEvents)
    .where(
      and(
        eq(taskCompletionEvents.taskId, task.id),
        eq(taskCompletionEvents.completedAt, completedAtIso),
        eq(taskCompletionEvents.userId, userId),
      ),
    );
  if (existing[0]) {
    return rowToEvent(existing[0]);
  }

  const pillars = await tx
    .select()
    .from(strategicPillars)
    .where(eq(strategicPillars.userId, userId));
  const snapshot = resolvePillarSnapshotForCompletion(task, pillars);
  const ts = nowIso();
  const completedAt = new Date(completedAtIso);
  const payload = buildCompletionEventPayload(
    { ...task, completedAt: completedAtIso },
    tz,
    completedAt,
    snapshot,
    id(),
    ts,
  );

  await tx.insert(taskCompletionEvents).values({
    id: payload.id,
    userId,
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

  return payload;
}

export async function deleteCompletionEventForTaskCompletion(
  tx: DbCompletionDeleter,
  userId: string,
  taskId: string,
  completedAt: string | null,
): Promise<void> {
  if (!completedAt) return;
  await tx
    .delete(taskCompletionEvents)
    .where(
      and(
        eq(taskCompletionEvents.taskId, taskId),
        eq(taskCompletionEvents.completedAt, completedAt),
        eq(taskCompletionEvents.userId, userId),
      ),
    );
}

export async function listCompletionEvents(
  query: ListCompletionEventsQuery,
): Promise<TaskCompletionEvent[]> {
  await ensureDbReady();
  const db = getDb();
  const conditions = [
    gte(taskCompletionEvents.occurrenceDate, query.since),
    lte(taskCompletionEvents.occurrenceDate, query.until),
    eq(taskCompletionEvents.userId, query.userId),
  ];
  if (query.pillarId !== undefined) {
    conditions.push(
      query.pillarId === null
        ? isNull(taskCompletionEvents.pillarId)
        : eq(taskCompletionEvents.pillarId, query.pillarId),
    );
  }

  const rows = await db
    .select()
    .from(taskCompletionEvents)
    .where(and(...conditions))
    .orderBy(
      desc(taskCompletionEvents.occurrenceDate),
      desc(taskCompletionEvents.completedAt),
    );

  const events = rows.map(rowToEvent);
  return filterCompletionEvents(events, {
    since: query.since,
    until: query.until,
    pillarId: query.pillarId,
    limit: query.limit,
  });
}

export async function summarizeCompletionsByPillar(
  query: Omit<ListCompletionEventsQuery, "pillarId" | "limit">,
): Promise<CompletionSummary[]> {
  const events = await listCompletionEvents({ ...query, limit: MAX_LIST_FOR_SUMMARY });
  return summarizeCompletionEventsByPillar(events, 3);
}

const MAX_LIST_FOR_SUMMARY = 500;
