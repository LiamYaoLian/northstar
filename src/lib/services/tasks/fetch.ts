import "server-only";

import { getDb } from "@/lib/db";
import { subtasks, tasks, timeEntries } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { scopedSubtaskId, scopedTaskId } from "./scoped";

export async function fetchTaskById(taskId: string, userId: string) {
  const rows = await getDb()
    .select()
    .from(tasks)
    .where(scopedTaskId(taskId, userId));
  return rows[0];
}

export async function fetchSubtaskById(subtaskId: string, userId: string) {
  const rows = await getDb()
    .select()
    .from(subtasks)
    .where(scopedSubtaskId(subtaskId, userId));
  return rows[0];
}

export async function fetchTimeEntryById(entryId: string, userId: string) {
  const rows = await getDb()
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, entryId), eq(timeEntries.userId, userId)));
  return rows[0];
}
