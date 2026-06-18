import { describe, it, expect } from "vitest";
import {
  computeAlignment,
  computePillarMinutes,
  computeWorkFocusTracks,
  detectProcrastination,
} from "./index";
import { makeTask, testEntries, testPillars } from "@/lib/test-fixtures";

const taskList = [
  makeTask({ id: "t1", pillarId: "p-work" }),
  makeTask({ id: "t2", pillarId: "p-health", title: "跑步" }),
];

describe("computePillarMinutes", () => {
  it("aggregates minutes by pillar and tracks unallocated", () => {
    const minutes = computePillarMinutes(testPillars, taskList, testEntries);
    expect(minutes.get("p-work")).toBe(120);
    expect(minutes.get("p-health")).toBe(30);
    expect(minutes.get("__unallocated__")).toBe(0);
  });
});

describe("computeAlignment", () => {
  it("calculates drift and alignment score", () => {
    const result = computeAlignment(testPillars, taskList, testEntries);
    expect(result.totalLoggedMin).toBe(150);
    expect(result.pillars[0].actualPct).toBe(80);
    expect(result.pillars[0].drift).toBe(40);
    expect(result.pillars[1].actualPct).toBe(20);
    expect(result.alignmentScore).toBeLessThan(100);
  });
});

describe("computeWorkFocusTracks", () => {
  it("computes drift per work focus track", () => {
    const tracks = computeWorkFocusTracks(testPillars[0], taskList, testEntries);
    expect(tracks.length).toBe(3);
    expect(tracks[0].actualShare).toBe(100);
    expect(tracks[0].drift).toBeGreaterThan(0);
  });
});

describe("detectProcrastination", () => {
  it("flags stale intimidating tasks with no logged time", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const signals = detectProcrastination(
      [
        makeTask({
          id: "stale",
          createdAt: "2026-01-01T00:00:00.000Z",
          intimidationScore: 4,
        }),
      ],
      [],
      now,
    );
    expect(signals.some((s) => s.taskId === "stale")).toBe(true);
  });

  it("flags high intimidation tasks with no logged time", () => {
    const now = new Date("2026-01-10T00:00:00.000Z");
    const signals = detectProcrastination(
      [
        makeTask({
          id: "scary",
          intimidationScore: 5,
          createdAt: "2026-01-08T00:00:00.000Z",
        }),
      ],
      [],
      now,
    );
    expect(signals[0]?.reason).toContain("恐吓");
  });
});
