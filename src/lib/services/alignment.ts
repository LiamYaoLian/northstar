import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { strategicPillars, tasks, timeEntries } from "@/lib/db/schema";
import { findWorkPillar } from "@/lib/pillars";
import {
  computeAlignment,
  computeWorkFocusTracks,
  detectProcrastination,
} from "@/lib/alignment";
import {
  filterTimeEntriesInDateRange,
  parseAlignmentPeriod,
  resolveAlignmentPeriod,
  type AlignmentPeriod,
} from "@/lib/review/period";
import { resolveTimezone } from "@/lib/tasks/timezone";
import { eq } from "drizzle-orm";

export async function getAlignmentDashboard(
  userId: string,
  tzInput?: string,
  periodInput: AlignmentPeriod = "week",
  now = new Date(),
) {
  await ensureDbReady();
  const tz = resolveTimezone(tzInput);
  const period = periodInput;
  const { periodStart, periodEnd } = resolveAlignmentPeriod(period, tz, now);
  const db = getDb();
  const pillars = (
    await db
      .select()
      .from(strategicPillars)
      .where(eq(strategicPillars.userId, userId))
  ).sort((a, b) => a.sortOrder - b.sortOrder);
  const taskList = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId));
  const allEntries = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.userId, userId));
  const entries =
    period === "all"
      ? allEntries
      : filterTimeEntriesInDateRange(allEntries, periodStart, periodEnd, tz);

  const alignment = computeAlignment(pillars, taskList, entries);
  const driftScore =
    Math.round(
      alignment.pillars.reduce((sum, pillar) => sum + Math.abs(pillar.drift), 0) * 10,
    ) / 10;
  const workPillar = findWorkPillar(pillars);
  const workTracks = workPillar
    ? computeWorkFocusTracks(workPillar, taskList, entries)
    : [];
  const procrastination = detectProcrastination(taskList, allEntries, now);

  return {
    alignment,
    workTracks,
    procrastination,
    period,
    periodStart,
    periodEnd,
    driftScore,
  };
}

export { parseAlignmentPeriod };
