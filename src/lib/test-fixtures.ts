import type { StrategicPillar, Task, TimeEntry } from "@/lib/db/schema";

export const testPillars: StrategicPillar[] = [
  {
    id: "p-work",
    userId: null,
    name: "工作",
    description: null,
    targetPct: 40,
    color: "#3b82f6",
    keywords: "[]",
    focusTracks: JSON.stringify([
      { name: "进大厂", shareOfParent: 50 },
      { name: "探索方向", shareOfParent: 30 },
      { name: "投资", shareOfParent: 20 },
    ]),
    floorMinPerWeek: null,
    capMaxPct: null,
    isHardConstraint: false,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "p-health",
    userId: null,
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
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    userId: null,
    title: "LC",
    description: null,
    pillarId: "p-work",
    focusTrack: "进大厂",
    projectId: null,
    status: "todo",
    intimidationScore: 2,
    priorityScore: 0.5,
    priorityFactors: null,
    priorityComputedAt: null,
    estimatedMin: 60,
    startAt: null,
    dueAt: null,
    manualSortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    completedAt: null,
    recurrenceType: "none",
    recurrenceDays: null,
    recurrenceCarryOver: false,
    ...overrides,
  };
}

export const testEntries: TimeEntry[] = [
  {
    id: "e1",
    userId: null,
    taskId: "t1",
    startedAt: "2026-01-02T00:00:00.000Z",
    durationMin: 120,
    source: "manual",
    note: null,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "e2",
    userId: null,
    taskId: "t2",
    startedAt: "2026-01-02T00:00:00.000Z",
    durationMin: 30,
    source: "manual",
    note: null,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];
