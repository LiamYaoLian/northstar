import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { subtasks, tasks } from "@/lib/db/schema";
import type { Subtask, Task } from "@/lib/db/schema";
import { shouldRecordCompletionTransition } from "@/lib/tasks/completion-events";
import {
  deleteCompletionEventForTaskCompletion,
  recordCompletionEvent,
} from "@/lib/services/completions";
import { resolveTimezone } from "@/lib/tasks/timezone";
import { nowIso } from "@/lib/utils";
import { fetchTaskById } from "./fetch";
import { buildTaskPatch, type TaskUpdatePatch } from "./patch";
import { scopedTaskId } from "./scoped";

export async function updateTask(
  taskId: string,
  patch: TaskUpdatePatch,
  options: { tz?: string; userId: string },
) {
  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const resolvedTz = resolveTimezone(options.tz);
  const now = new Date();
  const existing = await fetchTaskById(taskId, options.userId);
  if (!existing) return null;

  const safePatch = await buildTaskPatch(
    db,
    existing,
    patch,
    options.userId,
    options.tz,
  );
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
        .where(scopedTaskId(taskId, options.userId));
      if (!current) return;

      await tx
        .update(tasks)
        .set({
          ...safePatch,
          completedAt,
          updatedAt: ts,
        })
        .where(scopedTaskId(taskId, options.userId));

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
        await recordCompletionEvent(tx, options.userId, updatedTask, resolvedTz, now);
      }
      if (undoCompletion) {
        await deleteCompletionEventForTaskCompletion(
          tx,
          options.userId,
          current.id,
          current.completedAt,
        );
      }
    });
  } catch (err) {
    console.error("updateTask failed", { taskId, patch, err });
    throw err;
  }

  return fetchTaskById(taskId, options.userId);
}
