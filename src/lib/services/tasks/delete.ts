import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import {
  activeTimeSessions,
  subtasks,
  taskCompletionEvents,
  tasks,
  timeEntries,
} from "@/lib/db/schema";
import { fetchTaskById } from "./fetch";
import {
  scopedActiveSessionsForTask,
  scopedCompletionEventsForTask,
  scopedSubtasksForTask,
  scopedTaskId,
  scopedTimeEntriesForTask,
} from "./scoped";

export async function deleteTask(taskId: string, userId: string) {
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
