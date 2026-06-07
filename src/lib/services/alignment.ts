import "server-only";

import { getDb } from "@/lib/db";
import { strategicPillars, tasks, timeEntries } from "@/lib/db/schema";
import {
  computeAlignment,
  computeWorkFocusTracks,
  detectProcrastination,
} from "@/lib/alignment";

export function getAlignmentDashboard() {
  const db = getDb();
  const pillars = db
    .select()
    .from(strategicPillars)
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const taskList = db.select().from(tasks).all();
  const entries = db.select().from(timeEntries).all();

  const alignment = computeAlignment(pillars, taskList, entries);
  const workPillar = pillars.find((p) => p.name === "工作");
  const workTracks = workPillar
    ? computeWorkFocusTracks(workPillar, taskList, entries)
    : [];
  const procrastination = detectProcrastination(taskList, entries);

  return { alignment, workTracks, procrastination };
}
