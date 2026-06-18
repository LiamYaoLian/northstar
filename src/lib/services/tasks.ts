import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { tasks, timeEntries, subtasks, strategicPillars, northStars } from "@/lib/db/schema";
import {
  generateBreakdown,
  shouldAutoBreakdown,
} from "@/lib/ai/breakdown";
import { rerankAll, priorityScoreFromRank } from "@/lib/priority";
import { classifyTaskTitle } from "@/lib/tasks/classify";
import { id, nowIso } from "@/lib/utils";
import { eq } from "drizzle-orm";
import type { Subtask, Task } from "@/lib/db/schema";

async function persistPriorities(): Promise<string> {
  await ensureDbReady();
  const db = getDb();
  const allTasks = await db.select().from(tasks);
  const pillars = await db.select().from(strategicPillars);
  const entries = await db.select().from(timeEntries);
  const stars = await db.select().from(northStars);
  const star = stars[0];
  const allSubtasks = await db.select().from(subtasks);
  const results = rerankAll(
    allTasks,
    pillars,
    entries,
    star?.workPrimaryTrack,
    allSubtasks,
  );
  const ts = nowIso();

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

  return ts;
}

/** Run the priority engine and sync board order + scores. Call manually only. */
export async function recalculatePriorities() {
  const computedAt = await persistPriorities();
  return { computedAt };
}

export type TaskSortMode = "priority" | "manual";

/** Keep priorityScore monotonic with manual board order (repairs stale rows). */
async function syncActivePriorityFromManualOrder(
  db: ReturnType<typeof getDb>,
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

export async function listTasks(
  status?: string,
  sort: TaskSortMode = "priority",
) {
  await ensureDbReady();
  const db = getDb();
  const all = await db.select().from(tasks);
  const filtered = status ? all.filter((t) => t.status === status) : all;

  await syncActivePriorityFromManualOrder(db, filtered);
  const synced = await db.select().from(tasks);
  const rows = status ? synced.filter((t) => t.status === status) : synced;

  if (sort === "manual") {
    return rows.sort((a, b) => {
      if (a.manualSortOrder !== b.manualSortOrder) {
        return a.manualSortOrder - b.manualSortOrder;
      }
      return b.priorityScore - a.priorityScore;
    });
  }
  return rows.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return a.manualSortOrder - b.manualSortOrder;
  });
}

export async function listTasksWithSubtasks(
  status?: string,
  sort: TaskSortMode = "priority",
) {
  await ensureDbReady();
  const db = getDb();
  const taskList = await listTasks(status, sort);
  const allSubtasks = await db.select().from(subtasks);
  const byParent = new Map<string, Subtask[]>();
  for (const s of allSubtasks) {
    const list = byParent.get(s.parentTaskId) ?? [];
    list.push(s);
    byParent.set(s.parentTaskId, list);
  }
  return taskList.map((t) => ({
    ...t,
    subtasks: (byParent.get(t.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export async function getTodayTasks(limit = 5) {
  const rows = await listTasks();
  return rows.filter((t) => t.status !== "done").slice(0, limit);
}

export async function createTask(input: {
  title: string;
  description?: string;
  pillarId?: string;
  focusTrack?: string;
  estimatedMin?: number;
  dueAt?: string;
  intimidationScore?: number;
  autoBreakdown?: boolean;
}) {
  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const pillars = await db.select().from(strategicPillars);
  const classified = await classifyTaskTitle(input.title, pillars);

  const pillarId = input.pillarId ?? classified.pillarId;
  let focusTrack: string | null | undefined = input.focusTrack;
  if (focusTrack === undefined) {
    if (input.pillarId) {
      const workPillar = pillars.find((p) => p.name === "工作");
      focusTrack =
        input.pillarId === workPillar?.id ? classified.focusTrack : null;
    } else {
      focusTrack = classified.focusTrack;
    }
  }

  const taskId = id();
  const allTasks = await db.select().from(tasks);
  const maxOrder = allTasks.reduce(
    (max, t) => Math.max(max, t.manualSortOrder ?? 0),
    0,
  );

  await db.insert(tasks).values({
    id: taskId,
    title: input.title,
    description: input.description ?? null,
    pillarId: pillarId ?? null,
    focusTrack: focusTrack ?? null,
    status: "todo",
    intimidationScore: input.intimidationScore ?? 2,
    priorityScore: 0,
    estimatedMin: input.estimatedMin ?? null,
    dueAt: input.dueAt ?? null,
    isPinned: false,
    manualSortOrder: maxOrder + 1,
    postponedCount: 0,
    createdAt: ts,
    updatedAt: ts,
  });

  if (
    input.autoBreakdown !== false &&
    shouldAutoBreakdown(input.title, input.intimidationScore)
  ) {
    await breakdownTask(taskId);
  }

  const rows = await db.select().from(tasks).where(eq(tasks.id, taskId));
  return rows[0];
}

export async function breakdownTask(
  taskId: string,
  options?: { userPrompt?: string },
) {
  await ensureDbReady();
  const db = getDb();
  const taskRows = await db.select().from(tasks).where(eq(tasks.id, taskId));
  const task = taskRows[0];
  if (!task) return null;

  const stars = await db.select().from(northStars);
  const star = stars[0];
  const pillar = task.pillarId
    ? (
        await db
          .select()
          .from(strategicPillars)
          .where(eq(strategicPillars.id, task.pillarId))
      )[0]
    : null;

  const result = await generateBreakdown(task.title, task.description, {
    northStar: star?.statement,
    pillar: pillar?.name,
    userPrompt: options?.userPrompt,
  });

  await db.delete(subtasks).where(eq(subtasks.parentTaskId, taskId));

  const ts = nowIso();
  for (const [i, item] of result.subtasks.entries()) {
    await db.insert(subtasks).values({
      id: id(),
      parentTaskId: taskId,
      title: item.title,
      sortOrder: i,
      isEntryPoint: item.isEntryPoint ?? i === 0,
      isDone: false,
      createdAt: ts,
    });
  }

  await db
    .update(tasks)
    .set({
      intimidationScore: result.intimidationScore ?? task.intimidationScore,
      estimatedMin: task.estimatedMin ?? result.estimatedMinTotal ?? null,
      updatedAt: ts,
    })
    .where(eq(tasks.id, taskId));

  return {
    task: (await db.select().from(tasks).where(eq(tasks.id, taskId)))[0],
    subtasks: await listSubtasks(taskId),
    breakdown: result,
  };
}

export async function toggleSubtask(subtaskId: string, isDone: boolean) {
  await ensureDbReady();
  const db = getDb();
  await db.update(subtasks).set({ isDone }).where(eq(subtasks.id, subtaskId));

  const subRows = await db
    .select()
    .from(subtasks)
    .where(eq(subtasks.id, subtaskId));
  const sub = subRows[0];
  if (!sub) return null;

  const siblings = await listSubtasks(sub.parentTaskId);
  if (siblings.length > 0 && siblings.every((s) => s.isDone)) {
    await updateTask(sub.parentTaskId, { status: "done" });
  }

  return (await db.select().from(subtasks).where(eq(subtasks.id, subtaskId)))[0];
}

export async function updateTask(
  taskId: string,
  patch: Partial<{
    title: string;
    status: string;
    isPinned: boolean;
    pillarId: string | null;
    focusTrack: string | null;
    postponedCount: number;
    intimidationScore: number;
  }>,
) {
  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const existingRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
  const existing = existingRows[0];
  if (!existing) return null;

  const { intimidationScore, pillarId, focusTrack, ...rest } = patch;
  const safePatch: Record<string, unknown> = {
    ...rest,
    ...(intimidationScore != null
      ? { intimidationScore: Math.min(5, Math.max(1, intimidationScore)) }
      : {}),
  };

  if (pillarId !== undefined) {
    if (pillarId === null) {
      safePatch.pillarId = null;
      if (focusTrack === undefined) safePatch.focusTrack = null;
    } else {
      const pillar = (
        await db
          .select()
          .from(strategicPillars)
          .where(eq(strategicPillars.id, pillarId))
      )[0];
      if (!pillar) return null;
      safePatch.pillarId = pillarId;
      const allPillars = await db.select().from(strategicPillars);
      const workPillar = allPillars.find((p) => p.name === "工作");
      if (pillar.id !== workPillar?.id && focusTrack === undefined) {
        safePatch.focusTrack = null;
      }
    }
  }

  if (focusTrack !== undefined) {
    safePatch.focusTrack = focusTrack;
  }

  await db
    .update(tasks)
    .set({
      ...safePatch,
      completedAt: patch.status === "done" ? ts : existing.completedAt,
      updatedAt: ts,
    })
    .where(eq(tasks.id, taskId));

  return (await db.select().from(tasks).where(eq(tasks.id, taskId)))[0];
}

export async function addTimeEntry(input: {
  taskId: string;
  durationMin: number;
  source?: string;
  note?: string;
  startedAt?: string;
}) {
  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const entryId = id();
  await db.insert(timeEntries).values({
    id: entryId,
    taskId: input.taskId,
    startedAt: input.startedAt ?? ts,
    durationMin: input.durationMin,
    source: input.source ?? "manual",
    note: input.note ?? null,
    createdAt: ts,
  });

  const rows = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, entryId));
  return rows[0];
}

export async function listTimeEntries() {
  await ensureDbReady();
  return getDb().select().from(timeEntries);
}

export async function listSubtasks(taskId: string) {
  await ensureDbReady();
  const rows = await getDb()
    .select()
    .from(subtasks)
    .where(eq(subtasks.parentTaskId, taskId));
  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createSubtask(
  taskId: string,
  input: { title: string; isEntryPoint?: boolean },
) {
  await ensureDbReady();
  const db = getDb();
  const taskRows = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!taskRows[0]) return null;

  const existing = await listSubtasks(taskId);
  const ts = nowIso();
  const subtaskId = id();

  await db.insert(subtasks).values({
    id: subtaskId,
    parentTaskId: taskId,
    title: input.title.trim(),
    sortOrder: existing.length,
    isEntryPoint: input.isEntryPoint ?? existing.length === 0,
    isDone: false,
    createdAt: ts,
  });

  await db.update(tasks).set({ updatedAt: ts }).where(eq(tasks.id, taskId));

  return (await db.select().from(subtasks).where(eq(subtasks.id, subtaskId)))[0];
}

export async function deleteSubtask(subtaskId: string) {
  await ensureDbReady();
  const db = getDb();
  const subRows = await db
    .select()
    .from(subtasks)
    .where(eq(subtasks.id, subtaskId));
  const sub = subRows[0];
  if (!sub) return false;

  await db.delete(subtasks).where(eq(subtasks.id, subtaskId));

  const remaining = await listSubtasks(sub.parentTaskId);
  for (const [i, s] of remaining.entries()) {
    await db
      .update(subtasks)
      .set({ sortOrder: i })
      .where(eq(subtasks.id, s.id));
  }

  return true;
}

export async function reorderTasks(orderedIds: string[]) {
  await ensureDbReady();
  const db = getDb();
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
  return listTasks(undefined, "manual");
}

export async function reorderSubtasks(taskId: string, orderedIds: string[]) {
  await ensureDbReady();
  const db = getDb();
  const existing = await listSubtasks(taskId);
  const idSet = new Set(existing.map((s) => s.id));
  if (
    orderedIds.length !== existing.length ||
    !orderedIds.every((sid) => idSet.has(sid))
  ) {
    return null;
  }

  for (const [index, subtaskId] of orderedIds.entries()) {
    await db
      .update(subtasks)
      .set({ sortOrder: index })
      .where(eq(subtasks.id, subtaskId));
  }

  return listSubtasks(taskId);
}
