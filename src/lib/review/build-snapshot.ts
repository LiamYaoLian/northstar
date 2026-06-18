import type { StrategicPillar, Task, TimeEntry } from "@/lib/db/schema";
import { computeAlignment } from "@/lib/alignment";
import type { CompletionSummary } from "@/lib/services/completions";
import { filterTimeEntriesInDateRange } from "./period";

export type ReviewHighlights = {
  completions: CompletionSummary[];
  totalLoggedMin: number;
  totalCompletions: number;
};

export type ReviewSnapshotPayload = {
  periodStart: string;
  periodEnd: string;
  plannedPct: Record<string, number>;
  actualPct: Record<string, number>;
  driftScore: number;
  alignmentScore: number;
  highlights: ReviewHighlights;
};

export function buildReviewSnapshotPayload(input: {
  pillars: StrategicPillar[];
  tasks: Task[];
  entries: TimeEntry[];
  completions: CompletionSummary[];
  periodStart: string;
  periodEnd: string;
  tz: string;
}): ReviewSnapshotPayload {
  const periodEntries = filterTimeEntriesInDateRange(
    input.entries,
    input.periodStart,
    input.periodEnd,
    input.tz,
  );
  const alignment = computeAlignment(input.pillars, input.tasks, periodEntries);
  const plannedPct = Object.fromEntries(
    input.pillars.map((p) => [p.id, p.targetPct]),
  );
  const actualPct = Object.fromEntries(
    alignment.pillars.map((p) => [p.pillarId, p.actualPct]),
  );
  const driftScore = alignment.pillars.reduce(
    (sum, p) => sum + Math.abs(p.drift),
    0,
  );
  const totalCompletions = input.completions.reduce((sum, row) => sum + row.count, 0);

  return {
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    plannedPct,
    actualPct,
    driftScore: Math.round(driftScore * 10) / 10,
    alignmentScore: alignment.alignmentScore,
    highlights: {
      completions: input.completions,
      totalLoggedMin: alignment.totalLoggedMin,
      totalCompletions,
    },
  };
}

export function parseReviewHighlights(raw: string | null): ReviewHighlights | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReviewHighlights;
  } catch {
    return null;
  }
}

export function serializeReviewHighlights(highlights: ReviewHighlights): string {
  return JSON.stringify(highlights);
}
