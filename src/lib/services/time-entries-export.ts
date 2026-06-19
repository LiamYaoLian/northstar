import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { strategicPillars, tasks, timeEntries } from "@/lib/db/schema";
import { filterTimeEntriesInDateRange } from "@/lib/review/period";
import type { TimeEntryExportRow } from "@/lib/export/time-entries-csv";
import { resolveTimezone } from "@/lib/tasks/timezone";
import { eq } from "drizzle-orm";

export async function listTimeEntriesForExport(
  userId: string,
  since: string,
  until: string,
  tzInput?: string,
): Promise<TimeEntryExportRow[]> {
  await ensureDbReady();
  const tz = resolveTimezone(tzInput);
  const db = getDb();
  const allEntries = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.userId, userId));
  const filtered = filterTimeEntriesInDateRange(allEntries, since, until, tz);
  const taskList = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId));
  const pillars = await db
    .select()
    .from(strategicPillars)
    .where(eq(strategicPillars.userId, userId));
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
