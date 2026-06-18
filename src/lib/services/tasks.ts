import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import {
  tasks,
  timeEntries,
  subtasks,
  strategicPillars,
  northStars,
} from "@/lib/db/schema";
import {
  generateBreakdown,
  shouldAutoBreakdown,
} from "@/lib/ai/breakdown";
import { findWorkPillar, isWorkPillar } from "@/lib/pillars";
import {
  computeSubtaskDiff,
  hasSubtaskDiffChanges,
  resolveProposedSubtasks,
  type BreakdownPreviewResult,
  type ProposedSubtask,
  type SubtaskDiffLine,
} from "@/lib/tasks/subtask-diff";
import { analyzeTaskTitle } from "@/lib/tasks/analyze";
import type { ClassifyResult } from "@/lib/tasks/classify";
import {
  applyManualReorderScores,
  persistPriorities,
  syncActivePriorityFromManualOrder,
} from "@/lib/services/task-priority-sync";
import {
  sortTasks,
  filterTasksDueToday,
  type TaskSortMode,
} from "@/lib/services/task-sorting";
import {
  subtaskIdsForResetPlan,
} from "@/lib/services/occurrence-reset-plan";
import { toRecurrenceFields } from "@/lib/tasks/recurrence-types";
import { needsOccurrenceReset } from "@/lib/tasks/recurrence";
import type { RecurrenceType } from "@/lib/tasks/recurrence-types";
import { resolveTimezone } from "@/lib/tasks/timezone";
import { shouldRecordCompletionTransition } from "@/lib/tasks/completion-events";
import { recordCompletionEvent } from "@/lib/services/completions";
import { id, nowIso } from "@/lib/utils";
import { eq, inArray } from "drizzle-orm";
import type { StrategicPillar, Subtask, Task } from "@/lib/db/schema";

export type { TaskSortMode };

export async function recalculatePriorities(tz?: string) {
  await ensureDbReady();
  const db = getDb();
  const resolvedTz = resolveTimezone(tz);
  await openRecurringOccurrences(db, resolvedTz);
  const computedAt = await persistPriorities(resolvedTz);
  return { computedAt };
}

export async function openRecurringOccurrences(
  db: ReturnType<typeof getDb>,
  tz: string,
  now = new Date(),
) {
  const all = await db.select().from(tasks);
  const plan = all
    .filter(
      (task) =>
        task.recurrenceType !== "none" &&
        needsOccurrenceReset(toRecurrenceFields(task), now, tz),
    )
    .map((task) => task.id);

  if (plan.length === 0) return;

  const allSubtasks = await db.select().from(subtasks);
  const subtaskIds = subtaskIdsForResetPlan(plan, allSubtasks);
  const ts = nowIso();

  await db.transaction(async (tx) => {
    for (const taskId of plan) {
      await tx
        .update(tasks)
        .set({
          status: "todo",
          completedAt: null,
          updatedAt: ts,
        })
        .where(eq(tasks.id, taskId));
    }
    for (const subtaskId of subtaskIds) {
      await tx
        .update(subtasks)
        .set({ isDone: false })
        .where(eq(subtasks.id, subtaskId));
    }
  });
}

export async function listTasks(
  status?: string,
  sort: TaskSortMode = "priority",
  tz?: string,
) {
  await ensureDbReady();
  const db = getDb();
  const resolvedTz = resolveTimezone(tz);
  await openRecurringOccurrences(db, resolvedTz);

  const all = await db.select().from(tasks);
  const filtered = status ? all.filter((t) => t.status === status) : all;

  await syncActivePriorityFromManualOrder(db, filtered);
  const synced = await db.select().from(tasks);
  const rows = status ? synced.filter((t) => t.status === status) : synced;
  return sortTasks(rows, sort);
}

export async function listDueTodayTasksWithSubtasks(
  tz?: string,
  now = new Date(),
) {
  await ensureDbReady();
  const db = getDb();
  const resolvedTz = resolveTimezone(tz);
  await openRecurringOccurrences(db, resolvedTz, now);

  const all = await db.select().from(tasks);
  const dueToday = filterTasksDueToday(all, resolvedTz, now);
  const sorted = sortTasks(dueToday, "priority");
  const allSubtasks = await db.select().from(subtasks);
  const byParent = groupSubtasksByParent(allSubtasks);
  return sorted.map((t) => ({
    ...t,
    subtasks: (byParent.get(t.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export async function listTasksWithSubtasks(
  status?: string,
  sort: TaskSortMode = "priority",
  tz?: string,
) {
  await ensureDbReady();
  const db = getDb();
  const taskList = await listTasks(status, sort, tz);
  const allSubtasks = await db.select().from(subtasks);
  const byParent = groupSubtasksByParent(allSubtasks);
  return taskList.map((t) => ({
    ...t,
    subtasks: (byParent.get(t.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

function groupSubtasksByParent(allSubtasks: Subtask[]) {
  const byParent = new Map<string, Subtask[]>();
  for (const s of allSubtasks) {
    const list = byParent.get(s.parentTaskId) ?? [];
    list.push(s);
    byParent.set(s.parentTaskId, list);
  }
  return byParent;
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
  recurrenceType?: RecurrenceType;
  recurrenceDays?: number[] | null;
  recurrenceCarryOver?: boolean;
}) {
  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const pillars = await db.select().from(strategicPillars);
  const { classification: classified, estimate } = await analyzeTaskTitle(
    input.title,
    pillars,
  );
  const { pillarId, focusTrack } = resolveCreateClassification(
    input,
    pillars,
    classified,
  );

  const taskId = id();
  const allTasks = await db.select().from(tasks);
  const maxOrder = allTasks.reduce(
    (max, t) => Math.max(max, t.manualSortOrder ?? 0),
    0,
  );

  const recurrenceType = input.recurrenceType ?? "none";
  const recurrenceDays =
    recurrenceType === "weekly" && input.recurrenceDays?.length
      ? JSON.stringify(input.recurrenceDays)
      : null;
  const recurrenceCarryOver =
    recurrenceType === "weekly" ? Boolean(input.recurrenceCarryOver) : false;

  await db.insert(tasks).values({
    id: taskId,
    title: input.title,
    description: input.description ?? null,
    pillarId,
    focusTrack,
    status: "todo",
    intimidationScore: input.intimidationScore ?? 2,
    priorityScore: 0,
    estimatedMin: input.estimatedMin ?? estimate.estimatedMin ?? null,
    dueAt: recurrenceType !== "none" ? null : (input.dueAt ?? null),
    recurrenceType,
    recurrenceDays,
    recurrenceCarryOver,
    manualSortOrder: maxOrder + 1,
    createdAt: ts,
    updatedAt: ts,
  });

  if (
    input.autoBreakdown !== false &&
    shouldAutoBreakdown(input.title, input.intimidationScore)
  ) {
    await breakdownTask(taskId);
  }

  return fetchTaskById(taskId);
}

function resolveCreateClassification(
  input: { pillarId?: string; focusTrack?: string },
  pillars: StrategicPillar[],
  classified: ClassifyResult,
) {
  const pillarId = input.pillarId ?? classified.pillarId ?? null;
  let focusTrack: string | null | undefined = input.focusTrack;
  const workPillar = findWorkPillar(pillars);

  if (focusTrack === undefined) {
    if (input.pillarId) {
      focusTrack =
        input.pillarId === workPillar?.id ? classified.focusTrack : null;
    } else {
      focusTrack = classified.focusTrack;
    }
  }

  return {
    pillarId,
    focusTrack: focusTrack ?? null,
  };
}

export async function breakdownTask(
  taskId: string,
  options?: { userPrompt?: string },
) {
  const preview = await previewBreakdownTask(taskId, options);
  if (preview.preview) {
    throw new Error("Breakdown requires confirmation when subtasks already exist");
  }
  return preview;
}

export type BreakdownPreviewResponse = BreakdownPreviewResult;

export type BreakdownAppliedResponse = {
  preview: false;
  task: Task | null | undefined;
  subtasks: Subtask[];
  breakdown: Awaited<ReturnType<typeof generateBreakdown>>;
};

export async function previewBreakdownTask(
  taskId: string,
  options?: { userPrompt?: string },
): Promise<BreakdownPreviewResponse | BreakdownAppliedResponse> {
  await ensureDbReady();
  const db = getDb();
  const task = await fetchTaskById(taskId);
  if (!task) return { preview: false, task: null, subtasks: [], breakdown: null as never };

  const existing = await listSubtasks(taskId);
  const stars = await db.select().from(northStars);
  const pillar = task.pillarId
    ? (await db
        .select()
        .from(strategicPillars)
        .where(eq(strategicPillars.id, task.pillarId)))[0]
    : null;

  const breakdown = await generateBreakdown(task.title, task.description, {
    northStar: stars[0]?.statement,
    pillar: pillar?.name,
    userPrompt: options?.userPrompt,
    existingSubtasks: existing.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      isDone: subtask.isDone,
    })),
  });

  const proposed = resolveProposedSubtasks(existing, breakdown.subtasks);
  const diff = computeSubtaskDiff(existing, proposed);

  if (existing.length === 0 || !hasSubtaskDiffChanges(diff)) {
    return applyBreakdownPreview(taskId, proposed, breakdown);
  }

  return {
    preview: true,
    diff,
    proposed,
    summary: breakdown.summary,
    source: breakdown.source,
    noChanges: !hasSubtaskDiffChanges(diff),
  };
}

export async function applyBreakdownPreview(
  taskId: string,
  proposed: ProposedSubtask[],
  breakdown?: Awaited<ReturnType<typeof generateBreakdown>>,
): Promise<BreakdownAppliedResponse> {
  await ensureDbReady();
  const db = getDb();
  const task = await fetchTaskById(taskId);
  if (!task) {
    return { preview: false, task: null, subtasks: [], breakdown: breakdown as never };
  }

  const existing = await listSubtasks(taskId);
  const existingById = new Map(existing.map((subtask) => [subtask.id, subtask]));
  const keepIds = new Set(
    proposed.map((item) => item.existingId).filter(Boolean) as string[],
  );
  const deleteIds = existing
    .filter((subtask) => !keepIds.has(subtask.id))
    .map((subtask) => subtask.id);

  const ts = nowIso();
  const inserts: (typeof subtasks.$inferInsert)[] = [];
  const updates: { id: string; patch: Partial<typeof subtasks.$inferInsert> }[] = [];

  for (const [sortOrder, item] of proposed.entries()) {
    const title = item.title.trim();
    if (item.existingId && keepIds.has(item.existingId)) {
      const current = existingById.get(item.existingId);
      if (!current) continue;

      const patch: Partial<typeof subtasks.$inferInsert> = {};
      if (current.sortOrder !== sortOrder) {
        patch.sortOrder = sortOrder;
      }
      if (current.title !== title) {
        patch.title = title;
      }
      if (Object.keys(patch).length > 0) {
        updates.push({ id: item.existingId, patch });
      }
      continue;
    }

    inserts.push({
      id: id(),
      parentTaskId: taskId,
      title,
      sortOrder,
      isDone: false,
      createdAt: ts,
    });
  }

  await db.transaction(async (tx) => {
    if (deleteIds.length > 0) {
      await tx.delete(subtasks).where(inArray(subtasks.id, deleteIds));
    }

    for (const { id: subtaskId, patch } of updates) {
      await tx.update(subtasks).set(patch).where(eq(subtasks.id, subtaskId));
    }

    if (inserts.length > 0) {
      await tx.insert(subtasks).values(inserts);
    }

    if (breakdown) {
      await tx
        .update(tasks)
        .set({
          intimidationScore: breakdown.intimidationScore ?? task.intimidationScore,
          estimatedMin: task.estimatedMin ?? breakdown.estimatedMinTotal ?? null,
          updatedAt: ts,
        })
        .where(eq(tasks.id, taskId));
    } else {
      await tx.update(tasks).set({ updatedAt: ts }).where(eq(tasks.id, taskId));
    }
  });

  return {
    preview: false,
    task: await fetchTaskById(taskId),
    subtasks: await listSubtasks(taskId),
    breakdown: breakdown ?? (null as never),
  };
}

export async function updateSubtask(
  subtaskId: string,
  patch: { title?: string; isDone?: boolean },
  options?: { tz?: string },
) {
  await ensureDbReady();
  const db = getDb();
  const existing = await fetchSubtaskById(subtaskId);
  if (!existing) return null;

  const updates: { title?: string; isDone?: boolean } = {};
  if (patch.title !== undefined) {
    const trimmed = patch.title.trim();
    if (!trimmed) return null;
    updates.title = trimmed;
  }
  if (patch.isDone !== undefined) {
    updates.isDone = patch.isDone;
  }
  if (Object.keys(updates).length === 0) return existing;

  await db.update(subtasks).set(updates).where(eq(subtasks.id, subtaskId));

  if (patch.isDone !== undefined) {
    const siblings = await listSubtasks(existing.parentTaskId);
    if (siblings.length > 0 && siblings.every((s) => s.isDone)) {
      await updateTask(existing.parentTaskId, { status: "done" }, options);
    }
  }

  if (patch.title !== undefined) {
    await db
      .update(tasks)
      .set({ updatedAt: nowIso() })
      .where(eq(tasks.id, existing.parentTaskId));
  }

  return fetchSubtaskById(subtaskId);
}

export async function toggleSubtask(subtaskId: string, isDone: boolean) {
  return updateSubtask(subtaskId, { isDone });
}

export async function updateTask(
  taskId: string,
  patch: Partial<{
    title: string;
    status: string;
    pillarId: string | null;
    focusTrack: string | null;
    intimidationScore: number;
    estimatedMin: number | null;
    recurrenceType: RecurrenceType;
    recurrenceDays: number[] | null;
    recurrenceCarryOver: boolean;
  }>,
  options?: { tz?: string },
) {
  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const resolvedTz = resolveTimezone(options?.tz);
  const now = new Date();
  const existing = await fetchTaskById(taskId);
  if (!existing) return null;

  const safePatch = await buildTaskPatch(db, existing, patch);
  if (safePatch === null) return null;

  let completedAt = existing.completedAt;
  if (patch.status === "done") {
    completedAt = ts;
  } else if (patch.status !== undefined && patch.status !== "done") {
    completedAt = null;
  }

  try {
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      if (!current) return;

      await tx
        .update(tasks)
        .set({
          ...safePatch,
          completedAt,
          updatedAt: ts,
        })
        .where(eq(tasks.id, taskId));

      const recordEvent =
        patch.status === "done" &&
        shouldRecordCompletionTransition(current.status, "done");

      if (recordEvent) {
        const updatedTask = {
          ...current,
          ...safePatch,
          status: "done",
          completedAt,
          updatedAt: ts,
        } as Task;
        await recordCompletionEvent(tx, updatedTask, resolvedTz, now);
      }
    });
  } catch (err) {
    console.error("updateTask failed", { taskId, patch, err });
    throw err;
  }

  return fetchTaskById(taskId);
}

async function buildTaskPatch(
  db: ReturnType<typeof getDb>,
  existing: Task,
  patch: Parameters<typeof updateTask>[1],
) {
  const {
    intimidationScore,
    estimatedMin,
    pillarId,
    focusTrack,
    recurrenceType,
    recurrenceDays,
    recurrenceCarryOver,
    ...rest
  } = patch;
  const safePatch: Record<string, unknown> = {
    ...rest,
    ...(intimidationScore != null
      ? { intimidationScore: Math.min(5, Math.max(1, intimidationScore)) }
      : {}),
  };

  if (estimatedMin !== undefined) {
    if (
      estimatedMin === null ||
      (Number.isInteger(estimatedMin) && estimatedMin > 0)
    ) {
      safePatch.estimatedMin = estimatedMin;
    }
  }

  const nextRecurrenceType =
    recurrenceType ?? existing.recurrenceType ?? "none";
  if (recurrenceType !== undefined) {
    safePatch.recurrenceType = recurrenceType;
  }
  if (recurrenceDays !== undefined) {
    safePatch.recurrenceDays =
      nextRecurrenceType === "weekly" && recurrenceDays?.length
        ? JSON.stringify(recurrenceDays)
        : null;
  }
  if (recurrenceCarryOver !== undefined || recurrenceType !== undefined) {
    safePatch.recurrenceCarryOver =
      nextRecurrenceType === "weekly"
        ? Boolean(recurrenceCarryOver ?? existing.recurrenceCarryOver)
        : false;
  }
  if (
    recurrenceType !== undefined ||
    recurrenceDays !== undefined ||
    recurrenceCarryOver !== undefined
  ) {
    if (nextRecurrenceType !== "none") {
      safePatch.dueAt = null;
    }
  }

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
      const workPillar = findWorkPillar(await db.select().from(strategicPillars));
      if (!isWorkPillar(pillar, workPillar) && focusTrack === undefined) {
        safePatch.focusTrack = null;
      }
    }
  }

  if (focusTrack !== undefined) {
    safePatch.focusTrack = focusTrack;
  }

  return safePatch;
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

  return fetchTimeEntryById(entryId);
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
  input: { title: string },
) {
  await ensureDbReady();
  const db = getDb();
  if (!(await fetchTaskById(taskId))) return null;

  const existing = await listSubtasks(taskId);
  const ts = nowIso();
  const subtaskId = id();

  await db.insert(subtasks).values({
    id: subtaskId,
    parentTaskId: taskId,
    title: input.title.trim(),
    sortOrder: existing.length,
    isDone: false,
    createdAt: ts,
  });

  await db.update(tasks).set({ updatedAt: ts }).where(eq(tasks.id, taskId));
  return fetchSubtaskById(subtaskId);
}

export async function deleteSubtask(subtaskId: string) {
  await ensureDbReady();
  const db = getDb();
  const sub = await fetchSubtaskById(subtaskId);
  if (!sub) return false;

  await db.delete(subtasks).where(eq(subtasks.id, subtaskId));
  await reindexSubtasks(sub.parentTaskId);
  return true;
}

async function reindexSubtasks(parentTaskId: string) {
  const db = getDb();
  const remaining = await listSubtasks(parentTaskId);
  for (const [i, s] of remaining.entries()) {
    await db
      .update(subtasks)
      .set({ sortOrder: i })
      .where(eq(subtasks.id, s.id));
  }
}

export async function reorderTasks(orderedIds: string[]) {
  await ensureDbReady();
  await applyManualReorderScores(getDb(), orderedIds);
  return listTasks(undefined, "manual");
}

export async function reorderSubtasks(taskId: string, orderedIds: string[]) {
  await ensureDbReady();
  const db = getDb();
  const existing = await listSubtasks(taskId);
  if (!isValidReorder(orderedIds, existing.map((s) => s.id))) return null;

  for (const [index, subtaskId] of orderedIds.entries()) {
    await db
      .update(subtasks)
      .set({ sortOrder: index })
      .where(eq(subtasks.id, subtaskId));
  }

  return listSubtasks(taskId);
}

function isValidReorder(orderedIds: string[], existingIds: string[]) {
  const idSet = new Set(existingIds);
  return (
    orderedIds.length === existingIds.length &&
    orderedIds.every((sid) => idSet.has(sid))
  );
}

async function fetchTaskById(taskId: string) {
  const rows = await getDb()
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
  return rows[0];
}

async function fetchSubtaskById(subtaskId: string) {
  const rows = await getDb()
    .select()
    .from(subtasks)
    .where(eq(subtasks.id, subtaskId));
  return rows[0];
}

async function fetchTimeEntryById(entryId: string) {
  const rows = await getDb()
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, entryId));
  return rows[0];
}
