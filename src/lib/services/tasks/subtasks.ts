import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { subtasks, tasks } from "@/lib/db/schema";
import { estimateTaskMinutes } from "@/lib/tasks/estimate-time";
import { sumSubtaskEstimatedMin } from "@/lib/tasks/subtask-estimates";
import { id, nowIso } from "@/lib/utils";
import { fetchSubtaskById, fetchTaskById } from "./fetch";
import {
  scopedSubtaskId,
  scopedSubtasksForTask,
  scopedTaskId,
} from "./scoped";
import { updateTask } from "./update";

export async function listSubtasks(taskId: string, userId: string) {
  await ensureDbReady();
  const rows = await getDb()
    .select()
    .from(subtasks)
    .where(scopedSubtasksForTask(taskId, userId));
  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createSubtask(
  taskId: string,
  input: { title: string },
  userId: string,
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

export async function updateSubtask(
  subtaskId: string,
  patch: { title?: string; isDone?: boolean; estimatedMin?: number | null },
  options: { tz?: string; userId: string },
) {
  await ensureDbReady();
  const db = getDb();
  const existing = await fetchSubtaskById(subtaskId, options.userId);
  if (!existing) return null;

  const updates: {
    title?: string;
    isDone?: boolean;
    estimatedMin?: number | null;
  } = {};
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

  await db
    .update(subtasks)
    .set(updates)
    .where(scopedSubtaskId(subtaskId, options.userId));

  if (patch.isDone !== undefined) {
    const siblings = await listSubtasks(existing.parentTaskId, options.userId);
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
      const siblings = await listSubtasks(existing.parentTaskId, options.userId);
      taskPatch.estimatedMin = sumSubtaskEstimatedMin(siblings);
    }
    await db
      .update(tasks)
      .set(taskPatch)
      .where(scopedTaskId(existing.parentTaskId, options.userId));
  }

  return fetchSubtaskById(subtaskId, options.userId);
}

export async function deleteSubtask(subtaskId: string, userId: string) {
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

export async function reorderSubtasks(
  taskId: string,
  orderedIds: string[],
  userId: string,
) {
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

async function reindexSubtasks(parentTaskId: string, userId: string) {
  const db = getDb();
  const remaining = await listSubtasks(parentTaskId, userId);
  for (const [i, s] of remaining.entries()) {
    await db
      .update(subtasks)
      .set({ sortOrder: i })
      .where(scopedSubtaskId(s.id, userId));
  }
}

function isValidReorder(orderedIds: string[], existingIds: string[]) {
  const idSet = new Set(existingIds);
  return (
    orderedIds.length === existingIds.length &&
    orderedIds.every((sid) => idSet.has(sid))
  );
}
