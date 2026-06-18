import { describe, it, expect } from "vitest";
import { buildReviewSnapshotPayload } from "./build-snapshot";
import { makeTask, testPillars } from "@/lib/test-fixtures";

describe("buildReviewSnapshotPayload", () => {
  it("computes alignment for entries inside the period only", () => {
    const entries = [
      {
        id: "e1",
        taskId: "t1",
        startedAt: "2026-06-17T16:00:00.000Z",
        durationMin: 120,
        source: "manual" as const,
        note: null,
        createdAt: "2026-06-17T16:00:00.000Z",
      },
      {
        id: "e2",
        taskId: "t2",
        startedAt: "2026-06-17T18:00:00.000Z",
        durationMin: 30,
        source: "manual" as const,
        note: null,
        createdAt: "2026-06-17T18:00:00.000Z",
      },
      {
        id: "e-old",
        taskId: "t1",
        startedAt: "2026-01-01T12:00:00.000Z",
        durationMin: 500,
        source: "manual" as const,
        note: null,
        createdAt: "2026-01-01T12:00:00.000Z",
      },
    ];
    const payload = buildReviewSnapshotPayload({
      pillars: testPillars,
      tasks: [
        makeTask({ id: "t1", pillarId: "p-work" }),
        makeTask({ id: "t2", pillarId: "p-health", title: "跑步" }),
      ],
      entries,
      completions: [{ pillarId: "p-work", count: 2, topTitles: ["LC"] }],
      periodStart: "2026-06-16",
      periodEnd: "2026-06-18",
      tz: "America/New_York",
    });

    expect(payload.alignmentScore).toBeLessThan(100);
    expect(payload.plannedPct["p-work"]).toBe(40);
    expect(payload.highlights.totalCompletions).toBe(2);
    expect(payload.highlights.completions[0]?.topTitles).toEqual(["LC"]);
  });
});
