import { ensureDbReady, getDb, type Db } from "@/lib/db";
import {
  northStars,
  strategicPillars,
  tasks,
  timeEntries,
} from "@/lib/db/schema";
import type { Task } from "@/lib/db/schema";
import { priorityScoreFromRank, rerankAll } from "@/lib/priority";
import { resolveTimezone } from "@/lib/tasks/timezone";
import { nowIso } from "@/lib/utils";
import { and, eq } from "drizzle-orm";

export async function persistPriorities(tz?: string, userId?: string): Promise<string> {
  await ensureDbReady();
  const db = getDb();
  const resolvedTz = resolveTimezone(tz);
  const now = new Date();
  const [allTasks, pillars, entries, stars] = await Promise.all([
    userId
      ? db.select().from(tasks).where(eq(tasks.userId, userId))
      : db.select().from(tasks),
    userId
      ? db.select().from(strategicPillars).where(eq(strategicPillars.userId, userId))
      : db.select().from(strategicPillars),
    userId
      ? db.select().from(timeEntries).where(eq(timeEntries.userId, userId))
      : db.select().from(timeEntries),
    userId
      ? db.select().from(northStars).where(eq(northStars.userId, userId))
      : db.select().from(northStars),
  ]);

  const results = rerankAll(
    allTasks,
    pillars,
    entries,
    stars[0]?.workPrimaryTrack,
    now,
    resolvedTz,
  );
  const ts = nowIso();

  await applyPriorityResults(db, allTasks, results, ts, userId);
  return ts;
}

async function applyPriorityResults(
  db: Db,
  allTasks: Task[],
  results: ReturnType<typeof rerankAll>,
  ts: string,
  userId?: string,
) {
  for (const [index, r] of results.entries()) {
    await db
      .update(tasks)
      .set({
        priorityScore: priorityScoreFromRank(index, results.length),
        manualSortOrder: index,
        updatedAt: ts,
      })
      .where(scopedTaskId(r.taskId, userId));
  }

  const doneTasks = allTasks
    .filter((t) => t.status === "done")
    .sort((a, b) => a.manualSortOrder - b.manualSortOrder);

  for (const [i, task] of doneTasks.entries()) {
    await db
      .update(tasks)
      .set({ manualSortOrder: results.length + i, updatedAt: ts })
      .where(scopedTaskId(task.id, userId));
  }
}

export async function syncActivePriorityFromManualOrder(
  db: Db,
  filtered: Task[],
  userId?: string,
) {
  const active = filtered
    .filter((t) => t.status !== "done")
    .sort((a, b) => a.manualSortOrder - b.manualSortOrder);
  const total = active.length;
  if (total === 0) return;

  const ts = nowIso();
  for (const [index, task] of active.entries()) {
    const score = priorityScoreFromRank(index, total);
    if (Math.abs(task.priorityScore - score) > 1e-6) {
      await db
        .update(tasks)
        .set({
          priorityScore: score,
          updatedAt: ts,
        })
        .where(scopedTaskId(task.id, userId));
    }
  }
}

export async function applyManualReorderScores(
  db: Db,
  orderedIds: string[],
  userId?: string,
) {
  const ts = nowIso();
  const total = orderedIds.length;

  for (const [index, taskId] of orderedIds.entries()) {
    await db
      .update(tasks)
      .set({
        manualSortOrder: index,
        priorityScore: priorityScoreFromRank(index, total),
        updatedAt: ts,
      })
      .where(scopedTaskId(taskId, userId));
  }
}

function scopedTaskId(taskId: string, userId?: string) {
  return userId
    ? and(eq(tasks.id, taskId), eq(tasks.userId, userId))
    : eq(tasks.id, taskId);
}
