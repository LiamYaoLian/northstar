import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { strategicPillars, tasks, timeEntries } from "@/lib/db/schema";
import { filterTimeEntriesInDateRange } from "@/lib/review/period";
import type { TimeEntryExportRow } from "@/lib/export/time-entries-csv";
import { resolveTimezone } from "@/lib/tasks/timezone";
import { eq } from "drizzle-orm";

export async function listTimeEntriesForExport(
  since: string,
  until: string,
  tzInput?: string,
  userId?: string,
): Promise<TimeEntryExportRow[]> {
  await ensureDbReady();
  const tz = resolveTimezone(tzInput);
  const db = getDb();
  const entryRows = db.select().from(timeEntries);
  const allEntries = userId
    ? await entryRows.where(eq(timeEntries.userId, userId))
    : await entryRows;
  const filtered = filterTimeEntriesInDateRange(allEntries, since, until, tz);
  const taskRows = db.select().from(tasks);
  const taskList = userId
    ? await taskRows.where(eq(tasks.userId, userId))
    : await taskRows;
  const pillarRows = db.select().from(strategicPillars);
  const pillars = userId
    ? await pillarRows.where(eq(strategicPillars.userId, userId))
    : await pillarRows;
  const taskMap = new Map(taskList.map((task) => [task.id, task]));
  const pillarMap = new Map(pillars.map((pillar) => [pillar.id, pillar.name]));

  return filtered
    .map((entry) => {
      const task = taskMap.get(entry.taskId);
      return {
        startedAt: entry.startedAt,
        durationMin: entry.durationMin,
        source: entry.source,
        taskTitle: task?.title ?? "",
        pillarName: task?.pillarId ? (pillarMap.get(task.pillarId) ?? null) : null,
        focusTrack: task?.focusTrack ?? null,
        note: entry.note,
      };
    })
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}
