import { describe, it, expect } from "vitest";
import { computeAlignment } from "./index";
import type { StrategicPillar, Task, TimeEntry } from "@/lib/db/schema";

const pillars: StrategicPillar[] = [
  {
    id: "p1",
    name: "工作",
    description: null,
    targetPct: 40,
    color: "#3b82f6",
    keywords: "[]",
    focusTracks: null,
    floorMinPerWeek: null,
    capMaxPct: null,
    isHardConstraint: false,
    sortOrder: 0,
    createdAt: "2026-01-01",
  },
  {
    id: "p2",
    name: "健康",
    description: null,
    targetPct: 20,
    color: "#22c55e",
    keywords: "[]",
    focusTracks: null,
    floorMinPerWeek: null,
    capMaxPct: null,
    isHardConstraint: false,
    sortOrder: 1,
    createdAt: "2026-01-01",
  },
];

const taskList: Task[] = [
  {
    id: "t1",
    title: "LC",
    description: null,
    pillarId: "p1",
    focusTrack: null,
    status: "todo",
    intimidationScore: 3,
    priorityScore: 0,
    priorityFactors: null,
    priorityComputedAt: null,
    estimatedMin: 60,
    dueAt: null,
    isPinned: false,
    postponedCount: 0,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    completedAt: null,
  },
  {
    id: "t2",
    title: "跑步",
    description: null,
    pillarId: "p2",
    focusTrack: null,
    status: "todo",
    intimidationScore: 1,
    priorityScore: 0,
    priorityFactors: null,
    priorityComputedAt: null,
    estimatedMin: 30,
    dueAt: null,
    isPinned: false,
    postponedCount: 0,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    completedAt: null,
  },
];

const entries: TimeEntry[] = [
  {
    id: "e1",
    taskId: "t1",
    startedAt: "2026-01-02",
    durationMin: 120,
    source: "manual",
    note: null,
    createdAt: "2026-01-02",
  },
  {
    id: "e2",
    taskId: "t2",
    startedAt: "2026-01-02",
    durationMin: 30,
    source: "manual",
    note: null,
    createdAt: "2026-01-02",
  },
];

describe("computeAlignment", () => {
  it("calculates drift and alignment score", () => {
    const result = computeAlignment(pillars, taskList, entries);
    expect(result.totalLoggedMin).toBe(150);
    expect(result.pillars[0].actualPct).toBe(80);
    expect(result.pillars[0].drift).toBe(40);
    expect(result.pillars[1].actualPct).toBe(20);
    expect(result.alignmentScore).toBeLessThan(100);
  });
});
