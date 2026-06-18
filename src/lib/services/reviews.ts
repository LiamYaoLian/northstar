import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { reviewSnapshots, strategicPillars, tasks, timeEntries } from "@/lib/db/schema";
import {
  buildReviewSnapshotPayload,
  parseReviewHighlights,
  serializeReviewHighlights,
  type ReviewHighlights,
} from "@/lib/review/build-snapshot";
import { resolveReviewPeriod, type ReviewPeriod } from "@/lib/review/period";
import { summarizeCompletionsByPillar } from "@/lib/services/completions";
import { hasStrategy } from "@/lib/services/strategy";
import { resolveTimezone } from "@/lib/tasks/timezone";
import { id, nowIso } from "@/lib/utils";
import { and, desc, eq } from "drizzle-orm";

export type ReviewSnapshotView = {
  id: string;
  periodStart: string;
  periodEnd: string;
  plannedPct: Record<string, number>;
  actualPct: Record<string, number>;
  driftScore: number;
  alignmentScore: number;
  highlights: ReviewHighlights | null;
  createdAt: string;
};

export type ReviewDashboard = {
  period: ReviewPeriod;
  periodStart: string;
  periodEnd: string;
  live: ReviewSnapshotView;
  saved: ReviewSnapshotView | null;
  history: ReviewSnapshotView[];
};

function rowToView(row: typeof reviewSnapshots.$inferSelect): ReviewSnapshotView {
  return {
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    plannedPct: JSON.parse(row.plannedPct) as Record<string, number>,
    actualPct: JSON.parse(row.actualPct) as Record<string, number>,
    driftScore: row.driftScore,
    alignmentScore: row.alignmentScore,
    highlights: parseReviewHighlights(row.aiSummary),
    createdAt: row.createdAt,
  };
}

async function buildLiveReview(period: ReviewPeriod, tz: string, now = new Date()) {
  const { periodStart, periodEnd } = resolveReviewPeriod(period, tz, now);
  const db = getDb();
  const pillars = (await db.select().from(strategicPillars)).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const taskList = await db.select().from(tasks);
  const entries = await db.select().from(timeEntries);
  const completions = await summarizeCompletionsByPillar({
    since: periodStart,
    until: periodEnd,
    tz,
  });

  const payload = buildReviewSnapshotPayload({
    pillars,
    tasks: taskList,
    entries,
    completions,
    periodStart,
    periodEnd,
    tz,
  });

  return {
    id: "live",
    periodStart: payload.periodStart,
    periodEnd: payload.periodEnd,
    plannedPct: payload.plannedPct,
    actualPct: payload.actualPct,
    driftScore: payload.driftScore,
    alignmentScore: payload.alignmentScore,
    highlights: payload.highlights,
    createdAt: nowIso(),
  } satisfies ReviewSnapshotView;
}

export async function getReviewDashboard(
  period: ReviewPeriod,
  tzInput?: string,
  now = new Date(),
): Promise<ReviewDashboard | null> {
  if (!(await hasStrategy())) return null;
  await ensureDbReady();
  const tz = resolveTimezone(tzInput);
  const { periodStart, periodEnd } = resolveReviewPeriod(period, tz, now);
  const db = getDb();

  const live = await buildLiveReview(period, tz, now);

  const savedRows = await db
    .select()
    .from(reviewSnapshots)
    .where(
      and(
        eq(reviewSnapshots.periodStart, periodStart),
        eq(reviewSnapshots.periodEnd, periodEnd),
      ),
    )
    .orderBy(desc(reviewSnapshots.createdAt))
    .limit(1);
  const saved = savedRows[0] ? rowToView(savedRows[0]) : null;

  const historyRows = await db
    .select()
    .from(reviewSnapshots)
    .orderBy(desc(reviewSnapshots.createdAt))
    .limit(12);
  const history = historyRows.map(rowToView);

  return {
    period,
    periodStart,
    periodEnd,
    live,
    saved,
    history,
  };
}

export async function saveReviewSnapshot(
  period: ReviewPeriod,
  tzInput?: string,
  now = new Date(),
): Promise<ReviewSnapshotView | null> {
  const dashboard = await getReviewDashboard(period, tzInput, now);
  if (!dashboard) return null;

  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const live = dashboard.live;
  const highlights = live.highlights ?? {
    completions: [],
    totalLoggedMin: 0,
    totalCompletions: 0,
  };

  const existing = await db
    .select()
    .from(reviewSnapshots)
    .where(
      and(
        eq(reviewSnapshots.periodStart, live.periodStart),
        eq(reviewSnapshots.periodEnd, live.periodEnd),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(reviewSnapshots)
      .set({
        plannedPct: JSON.stringify(live.plannedPct),
        actualPct: JSON.stringify(live.actualPct),
        driftScore: live.driftScore,
        alignmentScore: live.alignmentScore,
        aiSummary: serializeReviewHighlights(highlights),
        createdAt: ts,
      })
      .where(eq(reviewSnapshots.id, existing[0].id));
    const updated = await db
      .select()
      .from(reviewSnapshots)
      .where(eq(reviewSnapshots.id, existing[0].id));
    return updated[0] ? rowToView(updated[0]) : null;
  }

  const snapshotId = id();
  await db.insert(reviewSnapshots).values({
    id: snapshotId,
    periodStart: live.periodStart,
    periodEnd: live.periodEnd,
    plannedPct: JSON.stringify(live.plannedPct),
    actualPct: JSON.stringify(live.actualPct),
    driftScore: live.driftScore,
    alignmentScore: live.alignmentScore,
    aiSummary: serializeReviewHighlights(highlights),
    createdAt: ts,
  });

  const row = await db
    .select()
    .from(reviewSnapshots)
    .where(eq(reviewSnapshots.id, snapshotId));
  return row[0] ? rowToView(row[0]) : null;
}
