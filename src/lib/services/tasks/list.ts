import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { subtasks, tasks } from "@/lib/db/schema";
import type { Subtask } from "@/lib/db/schema";
import {
  filterTasksDueToday,
  sortTasksByTime,
} from "@/lib/tasks/task-sorting";
import { resolveTimezone } from "@/lib/tasks/timezone";
import { eq } from "drizzle-orm";
import { ensureRecurringOccurrencesOpen } from "./recurrence-reset";

export function groupSubtasksByParent(allSubtasks: Subtask[]) {
  const byParent = new Map<string, Subtask[]>();
  for (const s of allSubtasks) {
    const list = byParent.get(s.parentTaskId) ?? [];
    list.push(s);
    byParent.set(s.parentTaskId, list);
  }
  return byParent;
}

export async function listTasks(
  userId: string,
  status?: string,
  tz?: string,
) {
  await ensureDbReady();
  const resolvedTz = resolveTimezone(tz);
  await ensureRecurringOccurrencesOpen(userId, resolvedTz);

  const db = getDb();
  const all = await db.select().from(tasks).where(eq(tasks.userId, userId));
  const filtered = status ? all.filter((t) => t.status === status) : all;
  return sortTasksByTime(filtered);
}

export async function listDueTodayTasksWithSubtasks(
  userId: string,
  tz?: string,
  now = new Date(),
) {
  await ensureDbReady();
  const db = getDb();
  const resolvedTz = resolveTimezone(tz);
  await ensureRecurringOccurrencesOpen(userId, resolvedTz, now);

  const all = await db.select().from(tasks).where(eq(tasks.userId, userId));
  const dueToday = filterTasksDueToday(all, resolvedTz, now);
  const sorted = sortTasksByTime(dueToday);
  const allSubtasks = await db
    .select()
    .from(subtasks)
    .where(eq(subtasks.userId, userId));
  const byParent = groupSubtasksByParent(allSubtasks);
  return sorted.map((t) => ({
    ...t,
    subtasks: (byParent.get(t.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export async function listTasksWithSubtasks(
  userId: string,
  status?: string,
  tz?: string,
) {
  if (status === "today") {
    return listDueTodayTasksWithSubtasks(userId, tz, new Date());
  }

  await ensureDbReady();
  const db = getDb();
  const taskList = await listTasks(userId, status, tz);
  const allSubtasks = await db
    .select()
    .from(subtasks)
    .where(eq(subtasks.userId, userId));
  const byParent = groupSubtasksByParent(allSubtasks);
  return taskList.map((t) => ({
    ...t,
    subtasks: (byParent.get(t.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}
