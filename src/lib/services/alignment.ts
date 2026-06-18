import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { strategicPillars, tasks, timeEntries } from "@/lib/db/schema";
import {
  computeAlignment,
  computeWorkFocusTracks,
  detectProcrastination,
} from "@/lib/alignment";

export async function getAlignmentDashboard() {
  await ensureDbReady();
  const db = getDb();
  const pillars = (await db.select().from(strategicPillars)).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const taskList = await db.select().from(tasks);
  const entries = await db.select().from(timeEntries);

  const alignment = computeAlignment(pillars, taskList, entries);
  const workPillar = pillars.find((p) => p.name === "工作");
  const workTracks = workPillar
    ? computeWorkFocusTracks(workPillar, taskList, entries)
    : [];
  const procrastination = detectProcrastination(taskList, entries);

  return { alignment, workTracks, procrastination };
}
