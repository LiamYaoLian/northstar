import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { subtasks, tasks } from "@/lib/db/schema";
import { subtaskIdsForResetPlan } from "@/lib/services/occurrence-reset-plan";
import { toRecurrenceFields } from "@/lib/tasks/recurrence-types";
import { needsOccurrenceReset } from "@/lib/tasks/recurrence";
import { nowIso } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { scopedSubtaskId, scopedTaskId } from "./scoped";

export async function openRecurringOccurrences(
  db: ReturnType<typeof getDb>,
  tz: string,
  now = new Date(),
  userId: string,
) {
  const allRows = db.select().from(tasks);
  const all = await allRows.where(eq(tasks.userId, userId));
  const plan = all
    .filter(
      (task) =>
        task.recurrenceType !== "none" &&
        needsOccurrenceReset(toRecurrenceFields(task), now, tz),
    )
    .map((task) => task.id);

  if (plan.length === 0) return;

  const subtaskRows = db.select().from(subtasks);
  const allSubtasks = await subtaskRows.where(eq(subtasks.userId, userId));
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

export async function ensureRecurringOccurrencesOpen(
  userId: string,
  tz: string,
  now = new Date(),
) {
  await ensureDbReady();
  const db = getDb();
  await openRecurringOccurrences(db, tz, now, userId);
}
