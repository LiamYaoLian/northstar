import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import {
  tasks,
  timeEntries,
  subtasks,
  strategicPillars,
  northStars,
  activeTimeSessions,
  taskCompletionEvents,
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
} from "@/lib/tasks/subtask-diff";
import {
  resolveCreateFocusTrack,
  shouldClearProjectIdOnPillarChange,
} from "@/lib/tasks/project-domain";
import {
  assertAssignableProject,
  getProjectById,
  ProjectValidationError,
} from "@/lib/services/projects";
import { analyzeTaskTitle } from "@/lib/tasks/analyze";
import { estimateTaskMinutes } from "@/lib/tasks/estimate-time";
import { sumSubtaskEstimatedMin } from "@/lib/tasks/subtask-estimates";
import {
  isValidTaskDateRange,
  normalizeTaskDate,
  normalizeTaskStartAt,
  resolveTaskStartAt,
} from "@/lib/tasks/task-dates";
import type { RecurrenceInference } from "@/lib/tasks/infer-recurrence";
import type { ClassifyResult } from "@/lib/tasks/classify";
import {
  applyManualReorderScores,
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
import {
  recurrenceTypeUsesDays,
  serializeRecurrenceDays,
} from "@/lib/tasks/recurrence-types";
import { resolveTimezone } from "@/lib/tasks/timezone";
import { shouldRecordCompletionTransition } from "@/lib/tasks/completion-events";
import {
  deleteCompletionEventForTaskCompletion,
  recordCompletionEvent,
} from "@/lib/services/completions";
import { id, nowIso } from "@/lib/utils";
import { and, eq, inArray } from "drizzle-orm";
import type { StrategicPillar, Subtask, Task } from "@/lib/db/schema";

export type { TaskSortMode };

export async function openRecurringOccurrences(
  db: ReturnType<typeof getDb>,
  tz: string,
  now = new Date(),
  userId?: string,
) {
  const allRows = db.select().from(tasks);
  const all = userId
    ? await allRows.where(eq(tasks.userId, userId))
    : await allRows;
  const plan = all
    .filter(
      (task) =>
        task.recurrenceType !== "none" &&
        needsOccurrenceReset(toRecurrenceFields(task), now, tz),
    )
    .map((task) => task.id);

  if (plan.length === 0) return;

  const subtaskRows = db.select().from(subtasks);
  const allSubtasks = userId
    ? await subtaskRows.where(eq(subtasks.userId, userId))
    : await subtaskRows;
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
        .where(scopedTaskId(taskId, userId));
    }
    for (const subtaskId of subtaskIds) {
      await tx
        .update(subtasks)
        .set({ isDone: false })
        .where(scopedSubtaskId(subtaskId, userId));
    }
  });
}

export async function listTasks(
  status?: string,
  sort: TaskSortMode = "priority",
  tz?: string,
  userId?: string,
) {
  await ensureDbReady();
  const db = getDb();
  const resolvedTz = resolveTimezone(tz);
  await openRecurringOccurrences(db, resolvedTz, new Date(), userId);

  const allRows = db.select().from(tasks);
  const all = userId
    ? await allRows.where(eq(tasks.userId, userId))
    : await allRows;
  const filtered = status ? all.filter((t) => t.status === status) : all;

  await syncActivePriorityFromManualOrder(db, filtered, userId);
  const syncedRows = db.select().from(tasks);
  const synced = userId
    ? await syncedRows.where(eq(tasks.userId, userId))
    : await syncedRows;
  const rows = status ? synced.filter((t) => t.status === status) : synced;
  return sortTasks(rows, sort);
}

export async function listDueTodayTasksWithSubtasks(
  tz?: string,
  sort: TaskSortMode = "priority",
  now = new Date(),
  userId?: string,
) {
  await ensureDbReady();
  const db = getDb();
  const resolvedTz = resolveTimezone(tz);
  await openRecurringOccurrences(db, resolvedTz, now, userId);

  const allRows = db.select().from(tasks);
  const all = userId
    ? await allRows.where(eq(tasks.userId, userId))
    : await allRows;
  const dueToday = filterTasksDueToday(all, resolvedTz, now);
  const sorted = sortTasks(dueToday, sort);
  const subtaskRows = db.select().from(subtasks);
  const allSubtasks = userId
    ? await subtaskRows.where(eq(subtasks.userId, userId))
    : await subtaskRows;
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
  userId?: string,
) {
  if (status === "today") {
    return listDueTodayTasksWithSubtasks(tz, sort, new Date(), userId);
  }

  await ensureDbReady();
  const db = getDb();
  const taskList = await listTasks(status, sort, tz, userId);
  const subtaskRows = db.select().from(subtasks);
  const allSubtasks = userId
    ? await subtaskRows.where(eq(subtasks.userId, userId))
    : await subtaskRows;
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
  projectId?: string;
  estimatedMin?: number;
  startAt?: string | null;
  dueAt?: string | null;
  intimidationScore?: number;
  autoBreakdown?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceDays?: number[] | null;
  recurrenceCarryOver?: boolean;
}, userId?: string, options?: { tz?: string }) {
  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const resolvedTz = resolveTimezone(options?.tz);
  const pillarRows = db.select().from(strategicPillars);
  const pillars = userId
    ? await pillarRows.where(eq(strategicPillars.userId, userId))
    : await pillarRows;
  const { classification: classified, estimate, recurrence: inferredRecurrence } =
    await analyzeTaskTitle(input.title, pillars);
  let pillarId = input.pillarId ?? classified.pillarId ?? null;
  let project = null as Awaited<ReturnType<typeof getProjectById>>;
  if (input.projectId) {
    project = await getProjectById(input.projectId, userId);
    if (!project || project.status !== "active") {
      throw new ProjectValidationError("Archived projects cannot be assigned");
    }
    if (pillarId && pillarId !== project.pillarId) {
      throw new ProjectValidationError("Task pillar must match project pillar");
    }
    pillarId = pillarId ?? project.pillarId;
  }
  const { focusTrack } = resolveCreateClassification(
    input,
    pillars,
    classified,
    project?.focusTrack ?? null,
    pillarId,
  );
  const resolvedRecurrence = resolveCreateRecurrence(input, inferredRecurrence);

  const taskId = id();
  const taskRows = db.select().from(tasks);
  const allTasks = userId
    ? await taskRows.where(eq(tasks.userId, userId))
    : await taskRows;
  const maxOrder = allTasks.reduce(
    (max, t) => Math.max(max, t.manualSortOrder ?? 0),
    0,
  );

  const recurrenceType = resolvedRecurrence.recurrenceType;
  const recurrenceDays = serializeRecurrenceDays(
    recurrenceType,
    resolvedRecurrence.recurrenceDays,
  );
  const recurrenceCarryOver =
    recurrenceType === "weekly"
      ? Boolean(resolvedRecurrence.recurrenceCarryOver)
      : false;

  const normalizedStart =
    input.startAt === null
      ? null
      : resolveTaskStartAt(input.startAt, resolvedTz);
  const normalizedDue =
    recurrenceType !== "none" ? null : normalizeTaskDate(input.dueAt);
  if (!isValidTaskDateRange(normalizedStart, normalizedDue, resolvedTz)) {
    throw new Error("Start date must be on or before due date");
  }

  await db.insert(tasks).values({
    id: taskId,
    userId: userId ?? null,
    title: input.title,
    description: input.description ?? null,
    pillarId,
    focusTrack,
    projectId: project?.id ?? null,
    status: "todo",
    intimidationScore: input.intimidationScore ?? 2,
    priorityScore: 0,
    estimatedMin: input.estimatedMin ?? estimate.estimatedMin ?? null,
    startAt: normalizedStart,
    dueAt: normalizedDue,
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
    await breakdownTask(taskId, { userId });
  }

  return fetchTaskById(taskId, userId);
}

function resolveCreateClassification(
  input: { pillarId?: string; focusTrack?: string; projectId?: string },
  pillars: StrategicPillar[],
  classified: ClassifyResult,
  projectFocusTrack: string | null,
  resolvedPillarId: string | null,
) {
  const workPillar = findWorkPillar(pillars);
  const focusTrack = resolveCreateFocusTrack({
    explicitFocusTrack: input.focusTrack,
    classifiedFocusTrack: classified.focusTrack,
    projectFocusTrack,
    pillarId: resolvedPillarId,
    workPillarId: workPillar?.id,
  });

  return {
    focusTrack,
  };
}

function resolveCreateRecurrence(
  input: {
    recurrenceType?: RecurrenceType;
    recurrenceDays?: number[] | null;
    recurrenceCarryOver?: boolean;
  },
  inferred: RecurrenceInference,
): {
  recurrenceType: RecurrenceType;
  recurrenceDays: number[] | null;
  recurrenceCarryOver: boolean;
} {
  if (input.recurrenceType === undefined) {
    return {
      recurrenceType: inferred.recurrenceType,
      recurrenceDays: recurrenceTypeUsesDays(inferred.recurrenceType)
        && inferred.recurrenceDays.length
        ? inferred.recurrenceDays
        : null,
      recurrenceCarryOver:
        inferred.recurrenceType === "weekly"
          ? inferred.recurrenceCarryOver
          : false,
    };
  }

  const recurrenceType = input.recurrenceType;
  return {
    recurrenceType,
    recurrenceDays:
      recurrenceTypeUsesDays(recurrenceType) && input.recurrenceDays?.length
        ? input.recurrenceDays
        : null,
    recurrenceCarryOver:
      recurrenceType === "weekly"
        ? Boolean(input.recurrenceCarryOver)
        : false,
  };
}

export async function breakdownTask(
  taskId: string,
  options?: { userPrompt?: string; userId?: string },
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
  options?: { userPrompt?: string; userId?: string },
): Promise<BreakdownPreviewResponse | BreakdownAppliedResponse> {
  await ensureDbReady();
  const db = getDb();
  const task = await fetchTaskById(taskId, options?.userId);
  if (!task) return { preview: false, task: null, subtasks: [], breakdown: null as never };

  const existing = await listSubtasks(taskId, options?.userId);
  const starRows = db.select().from(northStars);
  const stars = options?.userId
    ? await starRows.where(eq(northStars.userId, options.userId))
    : await starRows;
  const pillar = task.pillarId
    ? (await db
        .select()
        .from(strategicPillars)
        .where(scopedPillarId(task.pillarId, options?.userId)))[0]
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
    return applyBreakdownPreview(taskId, proposed, breakdown, options?.userId);
  }

  return {
    preview: true,
    diff,
    proposed,
    summary: breakdown.summary,
    source: breakdown.source,
    noChanges: !hasSubtaskDiffChanges(diff),
    estimatedMinTotal: breakdown.estimatedMinTotal,
  };
}

export async function applyBreakdownPreview(
  taskId: string,
  proposed: ProposedSubtask[],
  breakdown?: Awaited<ReturnType<typeof generateBreakdown>>,
  userId?: string,
): Promise<BreakdownAppliedResponse> {
  await ensureDbReady();
  const db = getDb();
  const task = await fetchTaskById(taskId, userId);
  if (!task) {
    return { preview: false, task: null, subtasks: [], breakdown: breakdown as never };
  }

  const existing = await listSubtasks(taskId, userId);
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
      if (
        item.estimatedMin !== undefined &&
        current.estimatedMin !== item.estimatedMin
      ) {
        patch.estimatedMin = item.estimatedMin;
      }
      if (Object.keys(patch).length > 0) {
        updates.push({ id: item.existingId, patch });
      }
      continue;
    }

    inserts.push({
      id: id(),
      userId: userId ?? task.userId ?? null,
      parentTaskId: taskId,
      title,
      sortOrder,
      isDone: false,
      estimatedMin: item.estimatedMin ?? null,
      createdAt: ts,
    });
  }

  await db.transaction(async (tx) => {
    if (deleteIds.length > 0) {
      await tx.delete(subtasks).where(scopedSubtaskIds(deleteIds, userId));
    }

    for (const { id: subtaskId, patch } of updates) {
      await tx.update(subtasks).set(patch).where(scopedSubtaskId(subtaskId, userId));
    }

    if (inserts.length > 0) {
      await tx.insert(subtasks).values(inserts);
    }

    if (breakdown) {
      await tx
        .update(tasks)
        .set({
          intimidationScore: breakdown.intimidationScore ?? task.intimidationScore,
          updatedAt: ts,
        })
        .where(scopedTaskId(taskId, userId));
    } else {
      await tx.update(tasks).set({ updatedAt: ts }).where(scopedTaskId(taskId, userId));
    }
  });

  const syncedSubtasks = await listSubtasks(taskId, userId);
  const estimatedMin = sumSubtaskEstimatedMin(syncedSubtasks);
  if (syncedSubtasks.length > 0) {
    await db
      .update(tasks)
      .set({ estimatedMin, updatedAt: nowIso() })
      .where(scopedTaskId(taskId, userId));
  }

  return {
    preview: false,
    task: await fetchTaskById(taskId, userId),
    subtasks: await listSubtasks(taskId, userId),
    breakdown: breakdown ?? (null as never),
  };
}

export async function updateSubtask(
  subtaskId: string,
  patch: { title?: string; isDone?: boolean; estimatedMin?: number | null },
  options?: { tz?: string; userId?: string },
) {
  await ensureDbReady();
  const db = getDb();
  const existing = await fetchSubtaskById(subtaskId, options?.userId);
  if (!existing) return null;

  const updates: { title?: string; isDone?: boolean; estimatedMin?: number | null } = {};
  if (patch.title !== undefined) {
    const trimmed = patch.title.trim();
    if (!trimmed) return null;
    updates.title = trimmed;
  }
  if (patch.isDone !== undefined) {
    updates.isDone = patch.isDone;
  }
  if (patch.estimatedMin !== undefined) {
    if (
      patch.estimatedMin !== null &&
      (!Number.isInteger(patch.estimatedMin) || patch.estimatedMin <= 0)
    ) {
      return null;
    }
    updates.estimatedMin = patch.estimatedMin;
  }
  if (Object.keys(updates).length === 0) return existing;

  await db.update(subtasks).set(updates).where(scopedSubtaskId(subtaskId, options?.userId));

  if (patch.isDone !== undefined) {
    const siblings = await listSubtasks(existing.parentTaskId, options?.userId);
    if (siblings.length > 0 && siblings.every((s) => s.isDone)) {
      await updateTask(existing.parentTaskId, { status: "done" }, options);
    }
  }

  if (patch.title !== undefined || patch.estimatedMin !== undefined) {
    const ts = nowIso();
    const taskPatch: { updatedAt: string; estimatedMin?: number | null } = {
      updatedAt: ts,
    };
    if (patch.estimatedMin !== undefined) {
      const siblings = await listSubtasks(existing.parentTaskId, options?.userId);
      taskPatch.estimatedMin = sumSubtaskEstimatedMin(siblings);
    }
    await db
      .update(tasks)
      .set(taskPatch)
      .where(scopedTaskId(existing.parentTaskId, options?.userId));
  }

  return fetchSubtaskById(subtaskId, options?.userId);
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
    projectId: string | null;
    intimidationScore: number;
    estimatedMin: number | null;
    startAt: string | null;
    dueAt: string | null;
    recurrenceType: RecurrenceType;
    recurrenceDays: number[] | null;
    recurrenceCarryOver: boolean;
  }>,
  options?: { tz?: string; userId?: string },
) {
  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const resolvedTz = resolveTimezone(options?.tz);
  const now = new Date();
  const existing = await fetchTaskById(taskId, options?.userId);
  if (!existing) return null;

  const safePatch = await buildTaskPatch(db, existing, patch, options?.userId, options?.tz);
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
        .where(scopedTaskId(taskId, options?.userId));
      if (!current) return;

      await tx
        .update(tasks)
        .set({
          ...safePatch,
          completedAt,
          updatedAt: ts,
        })
        .where(scopedTaskId(taskId, options?.userId));

      const recordEvent =
        patch.status === "done" &&
        shouldRecordCompletionTransition(current.status, "done");
      const undoCompletion =
        current.status === "done" &&
        patch.status !== undefined &&
        patch.status !== "done";

      if (recordEvent) {
        const updatedTask = {
          ...current,
          ...safePatch,
          status: "done",
          completedAt,
          updatedAt: ts,
        } as Task;
        await recordCompletionEvent(tx, options?.userId, updatedTask, resolvedTz, now);
      }
      if (undoCompletion) {
        await deleteCompletionEventForTaskCompletion(
          tx,
          options?.userId,
          current.id,
          current.completedAt,
        );
      }
    });
  } catch (err) {
    console.error("updateTask failed", { taskId, patch, err });
    throw err;
  }

  return fetchTaskById(taskId, options?.userId);
}

async function buildTaskPatch(
  db: ReturnType<typeof getDb>,
  existing: Task,
  patch: Parameters<typeof updateTask>[1],
  userId?: string,
  tz?: string,
) {
  const {
    intimidationScore,
    estimatedMin,
    startAt,
    dueAt,
    pillarId,
    focusTrack,
    projectId,
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

  if (startAt !== undefined) {
    safePatch.startAt = normalizeTaskStartAt(startAt, tz);
  }

  const nextRecurrenceType =
    recurrenceType ?? existing.recurrenceType ?? "none";

  if (dueAt !== undefined) {
    safePatch.dueAt =
      nextRecurrenceType !== "none" ? null : normalizeTaskDate(dueAt);
  }

  const effectiveStart = normalizeTaskStartAt(
    (safePatch.startAt as string | null | undefined) ?? existing.startAt,
    tz,
  );
  const effectiveDue = normalizeTaskDate(
    (safePatch.dueAt as string | null | undefined) ?? existing.dueAt,
  );
  if (!isValidTaskDateRange(effectiveStart, effectiveDue, tz)) {
    return null;
  }

  if (recurrenceType !== undefined) {
    safePatch.recurrenceType = recurrenceType;
  }
  if (recurrenceDays !== undefined) {
    safePatch.recurrenceDays = serializeRecurrenceDays(
      nextRecurrenceType as RecurrenceType,
      recurrenceDays,
    );
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

  const needsWorkPillarContext =
    pillarId !== undefined || projectId !== undefined;
  let workPillar:
    | Awaited<ReturnType<typeof findWorkPillar>>
    | undefined;

  if (needsWorkPillarContext) {
    const pillarRows = db.select().from(strategicPillars);
    const pillars = userId
      ? await pillarRows.where(eq(strategicPillars.userId, userId))
      : await pillarRows;
    workPillar = findWorkPillar(pillars);
  }

  if (pillarId !== undefined) {
    if (pillarId === null) {
      safePatch.pillarId = null;
      if (focusTrack === undefined) safePatch.focusTrack = null;
      safePatch.projectId = null;
    } else {
      const pillar = (
        await db
          .select()
          .from(strategicPillars)
          .where(scopedPillarId(pillarId, userId))
      )[0];
      if (!pillar) return null;
      safePatch.pillarId = pillarId;
      if (!isWorkPillar(pillar, workPillar) && focusTrack === undefined) {
        safePatch.focusTrack = null;
      }
      if (shouldClearProjectIdOnPillarChange(pillarId, workPillar?.id)) {
        safePatch.projectId = null;
      }
    }
  }

  if (focusTrack !== undefined) {
    safePatch.focusTrack = focusTrack;
  }

  if (projectId !== undefined) {
    if (projectId === null) {
      safePatch.projectId = null;
    } else {
      const effectivePillarId =
        (safePatch.pillarId as string | null | undefined) ?? existing.pillarId;
      await assertAssignableProject(
        projectId,
        effectivePillarId,
        userId,
        db,
      );
      safePatch.projectId = projectId;
    }
  }

  return safePatch;
}

export async function addTimeEntry(input: {
  taskId: string;
  durationMin: number;
  source?: string;
  note?: string;
  startedAt?: string;
}, userId?: string) {
  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const task = await fetchTaskById(input.taskId, userId);
  if (!task) return null;
  const entryId = id();
  await db.insert(timeEntries).values({
    id: entryId,
    userId: userId ?? task.userId ?? null,
    taskId: input.taskId,
    startedAt: input.startedAt ?? ts,
    durationMin: input.durationMin,
    source: input.source ?? "manual",
    note: input.note ?? null,
    createdAt: ts,
  });

  return fetchTimeEntryById(entryId, userId);
}

export async function listTimeEntries(userId?: string) {
  await ensureDbReady();
  const rows = getDb().select().from(timeEntries);
  return userId ? rows.where(eq(timeEntries.userId, userId)) : rows;
}

export async function listSubtasks(taskId: string, userId?: string) {
  await ensureDbReady();
  const rows = await getDb()
    .select()
    .from(subtasks)
    .where(
      userId
        ? and(eq(subtasks.parentTaskId, taskId), eq(subtasks.userId, userId))
        : eq(subtasks.parentTaskId, taskId),
    );
  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createSubtask(
  taskId: string,
  input: { title: string },
  userId?: string,
) {
  await ensureDbReady();
  const db = getDb();
  const task = await fetchTaskById(taskId, userId);
  if (!task) return null;

  const existing = await listSubtasks(taskId, userId);
  const ts = nowIso();
  const subtaskId = id();
  const estimate = await estimateTaskMinutes(input.title.trim());

  await db.insert(subtasks).values({
    id: subtaskId,
    userId: userId ?? task.userId ?? null,
    parentTaskId: taskId,
    title: input.title.trim(),
    sortOrder: existing.length,
    isDone: false,
    estimatedMin: estimate.estimatedMin,
    createdAt: ts,
  });

  const syncedSubtasks = await listSubtasks(taskId, userId);
  await db
    .update(tasks)
    .set({
      estimatedMin: sumSubtaskEstimatedMin(syncedSubtasks),
      updatedAt: ts,
    })
    .where(scopedTaskId(taskId, userId));

  return fetchSubtaskById(subtaskId, userId);
}

export async function deleteTask(taskId: string, userId?: string) {
  await ensureDbReady();
  const db = getDb();
  const task = await fetchTaskById(taskId, userId);
  if (!task) return false;

  await db.transaction(async (tx) => {
    await tx
      .delete(subtasks)
      .where(scopedSubtasksForTask(taskId, userId));
    await tx
      .delete(timeEntries)
      .where(scopedTimeEntriesForTask(taskId, userId));
    await tx
      .delete(activeTimeSessions)
      .where(scopedActiveSessionsForTask(taskId, userId));
    await tx
      .delete(taskCompletionEvents)
      .where(scopedCompletionEventsForTask(taskId, userId));
    await tx.delete(tasks).where(scopedTaskId(taskId, userId));
  });

  return true;
}

export async function deleteSubtask(subtaskId: string, userId?: string) {
  await ensureDbReady();
  const db = getDb();
  const sub = await fetchSubtaskById(subtaskId, userId);
  if (!sub) return false;

  await db.delete(subtasks).where(scopedSubtaskId(subtaskId, userId));
  await reindexSubtasks(sub.parentTaskId, userId);

  const syncedSubtasks = await listSubtasks(sub.parentTaskId, userId);
  const ts = nowIso();
  await db
    .update(tasks)
    .set({
      estimatedMin:
        syncedSubtasks.length > 0 ? sumSubtaskEstimatedMin(syncedSubtasks) : null,
      updatedAt: ts,
    })
    .where(scopedTaskId(sub.parentTaskId, userId));

  return true;
}

async function reindexSubtasks(parentTaskId: string, userId?: string) {
  const db = getDb();
  const remaining = await listSubtasks(parentTaskId, userId);
  for (const [i, s] of remaining.entries()) {
    await db
      .update(subtasks)
      .set({ sortOrder: i })
      .where(scopedSubtaskId(s.id, userId));
  }
}

export async function reorderTasks(orderedIds: string[], userId?: string) {
  await ensureDbReady();
  if (userId) {
    const owned = await getDb()
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.id, orderedIds)));
    if (owned.length !== orderedIds.length) return null;
  }
  await applyManualReorderScores(getDb(), orderedIds, userId);
  return listTasks(undefined, "manual", undefined, userId);
}

export async function reorderSubtasks(taskId: string, orderedIds: string[], userId?: string) {
  await ensureDbReady();
  const db = getDb();
  const existing = await listSubtasks(taskId, userId);
  if (!isValidReorder(orderedIds, existing.map((s) => s.id))) return null;

  for (const [index, subtaskId] of orderedIds.entries()) {
    await db
      .update(subtasks)
      .set({ sortOrder: index })
      .where(scopedSubtaskId(subtaskId, userId));
  }

  return listSubtasks(taskId, userId);
}

function isValidReorder(orderedIds: string[], existingIds: string[]) {
  const idSet = new Set(existingIds);
  return (
    orderedIds.length === existingIds.length &&
    orderedIds.every((sid) => idSet.has(sid))
  );
}

async function fetchTaskById(taskId: string, userId?: string) {
  const rows = await getDb()
    .select()
    .from(tasks)
    .where(scopedTaskId(taskId, userId));
  return rows[0];
}

async function fetchSubtaskById(subtaskId: string, userId?: string) {
  const rows = await getDb()
    .select()
    .from(subtasks)
    .where(scopedSubtaskId(subtaskId, userId));
  return rows[0];
}

async function fetchTimeEntryById(entryId: string, userId?: string) {
  const rows = await getDb()
    .select()
    .from(timeEntries)
    .where(
      userId
        ? and(eq(timeEntries.id, entryId), eq(timeEntries.userId, userId))
        : eq(timeEntries.id, entryId),
    );
  return rows[0];
}

function scopedTaskId(taskId: string, userId?: string) {
  return userId
    ? and(eq(tasks.id, taskId), eq(tasks.userId, userId))
    : eq(tasks.id, taskId);
}

function scopedSubtaskId(subtaskId: string, userId?: string) {
  return userId
    ? and(eq(subtasks.id, subtaskId), eq(subtasks.userId, userId))
    : eq(subtasks.id, subtaskId);
}

function scopedSubtasksForTask(taskId: string, userId?: string) {
  return userId
    ? and(eq(subtasks.parentTaskId, taskId), eq(subtasks.userId, userId))
    : eq(subtasks.parentTaskId, taskId);
}

function scopedTimeEntriesForTask(taskId: string, userId?: string) {
  return userId
    ? and(eq(timeEntries.taskId, taskId), eq(timeEntries.userId, userId))
    : eq(timeEntries.taskId, taskId);
}

function scopedActiveSessionsForTask(taskId: string, userId?: string) {
  return userId
    ? and(eq(activeTimeSessions.taskId, taskId), eq(activeTimeSessions.userId, userId))
    : eq(activeTimeSessions.taskId, taskId);
}

function scopedCompletionEventsForTask(taskId: string, userId?: string) {
  return userId
    ? and(
        eq(taskCompletionEvents.taskId, taskId),
        eq(taskCompletionEvents.userId, userId),
      )
    : eq(taskCompletionEvents.taskId, taskId);
}

function scopedSubtaskIds(subtaskIds: string[], userId?: string) {
  return userId
    ? and(inArray(subtasks.id, subtaskIds), eq(subtasks.userId, userId))
    : inArray(subtasks.id, subtaskIds);
}

function scopedPillarId(pillarId: string, userId?: string) {
  return userId
    ? and(eq(strategicPillars.id, pillarId), eq(strategicPillars.userId, userId))
    : eq(strategicPillars.id, pillarId);
}
