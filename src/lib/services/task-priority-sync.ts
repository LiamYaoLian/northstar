import { ensureDbReady, getDb, type Db } from "@/lib/db";
import {
  northStars,
  strategicPillars,
  subtasks,
  tasks,
  timeEntries,
} from "@/lib/db/schema";
import type { Task } from "@/lib/db/schema";
import { priorityScoreFromRank, rerankAll } from "@/lib/priority";
import { resolveTimezone } from "@/lib/tasks/timezone";
import { nowIso } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function persistPriorities(tz?: string): Promise<string> {
  await ensureDbReady();
  const db = getDb();
  const resolvedTz = resolveTimezone(tz);
  const now = new Date();
  const [allTasks, pillars, entries, stars, allSubtasks] = await Promise.all([
    db.select().from(tasks),
    db.select().from(strategicPillars),
    db.select().from(timeEntries),
    db.select().from(northStars),
    db.select().from(subtasks),
  ]);

  const results = rerankAll(
    allTasks,
    pillars,
    entries,
    stars[0]?.workPrimaryTrack,
    allSubtasks,
    now,
    resolvedTz,
  );
  const ts = nowIso();

  await applyPriorityResults(db, allTasks, results, ts);
  return ts;
}

async function applyPriorityResults(
  db: Db,
  allTasks: Task[],
  results: ReturnType<typeof rerankAll>,
  ts: string,
) {
  for (const [index, r] of results.entries()) {
    await db
      .update(tasks)
      .set({
        priorityScore: priorityScoreFromRank(index, results.length),
        priorityFactors: JSON.stringify(r.factors),
        priorityComputedAt: ts,
        manualSortOrder: index,
        updatedAt: ts,
      })
      .where(eq(tasks.id, r.taskId));
  }

  const doneTasks = allTasks
    .filter((t) => t.status === "done")
    .sort((a, b) => a.manualSortOrder - b.manualSortOrder);

  for (const [i, task] of doneTasks.entries()) {
    await db
      .update(tasks)
      .set({ manualSortOrder: results.length + i, updatedAt: ts })
      .where(eq(tasks.id, task.id));
  }
}

export async function syncActivePriorityFromManualOrder(
  db: Db,
  filtered: Task[],
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
          priorityComputedAt: ts,
          updatedAt: ts,
        })
        .where(eq(tasks.id, task.id));
    }
  }
}

export async function applyManualReorderScores(
  db: Db,
  orderedIds: string[],
) {
  const ts = nowIso();
  const total = orderedIds.length;

  for (const [index, taskId] of orderedIds.entries()) {
    await db
      .update(tasks)
      .set({
        manualSortOrder: index,
        priorityScore: priorityScoreFromRank(index, total),
        priorityComputedAt: ts,
        updatedAt: ts,
      })
      .where(eq(tasks.id, taskId));
  }
}
