import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { strategicPillars, tasks, timeEntries } from "@/lib/db/schema";
import { findWorkPillar } from "@/lib/pillars";
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
  const workPillar = findWorkPillar(pillars);
  const workTracks = workPillar
    ? computeWorkFocusTracks(workPillar, taskList, entries)
    : [];
  const procrastination = detectProcrastination(taskList, entries);

  return { alignment, workTracks, procrastination };
}
