import { describe, it, expect } from "vitest";
import {
  filterActiveTasks,
  filterTasksDueToday,
  rankAndLimit,
  sortTasks,
  takeTopTasks,
} from "./task-sorting";
import { makeTask } from "@/lib/test-fixtures";
import {
  TEST_TZ,
  MONDAY_10AM_NY,
  MONDAY_8PM_NY,
  TUESDAY_10AM_NY,
  WEDNESDAY_10AM_NY,
  dailyTask,
  makeRecurringTaskRow,
  weeklyMonOnly,
  weeklyMonWed,
} from "@/lib/tasks/recurrence-test-helpers";
import { filterTasksByPillar } from "@/lib/tasks/enrich-tasks";

describe("sortTasks", () => {
  const rows = [
    makeTask({ id: "a", priorityScore: 0.3, manualSortOrder: 2 }),
    makeTask({ id: "b", priorityScore: 0.9, manualSortOrder: 0 }),
    makeTask({ id: "c", priorityScore: 0.5, manualSortOrder: 1 }),
  ];

  it("sorts by priority score descending", () => {
    expect(sortTasks(rows, "priority").map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by manual order", () => {
    expect(sortTasks(rows, "manual").map((t) => t.id)).toEqual(["b", "c", "a"]);
  });
});

describe("filterActiveTasks", () => {
  it("excludes done tasks", () => {
    const rows = [
      makeTask({ id: "open", status: "todo" }),
      makeTask({ id: "closed", status: "done" }),
    ];
    expect(filterActiveTasks(rows).map((t) => t.id)).toEqual(["open"]);
  });
});

describe("rankAndLimit", () => {
  it("sorts by priority and slices without filtering done", () => {
    const rows = [
      makeTask({ id: "low", priorityScore: 0.1, status: "todo" }),
      makeTask({ id: "high", priorityScore: 0.9, status: "todo" }),
      makeTask({ id: "done", priorityScore: 1, status: "done" }),
    ];
    expect(rankAndLimit(rows, 2).map((t) => t.id)).toEqual(["done", "high"]);
  });
});

describe("takeTopTasks", () => {
  it("returns highest-priority active tasks up to limit", () => {
    const rows = [
      makeTask({ id: "low", priorityScore: 0.1, status: "todo" }),
      makeTask({ id: "high", priorityScore: 0.9, status: "todo" }),
      makeTask({ id: "done", priorityScore: 1, status: "done" }),
    ];
    expect(takeTopTasks(rows, 1).map((t) => t.id)).toEqual(["high"]);
  });
});

describe("filterTasksDueToday", () => {
  it("includes one-off todo tasks regardless of calendar day", () => {
    const rows = [
      makeRecurringTaskRow({ id: "one-off", status: "todo" }),
      makeRecurringTaskRow({ id: "done", status: "done" }),
    ];
    const result = filterTasksDueToday(rows, TEST_TZ, MONDAY_10AM_NY);
    expect(result.map((t) => t.id)).toEqual(["one-off"]);
  });

  it("excludes weekly Mon/Wed task on Tuesday", () => {
    const rows = [
      makeRecurringTaskRow({
        id: "weekly",
        status: "todo",
        recurrenceType: "weekly",
        recurrenceDays: weeklyMonWed().recurrenceDays,
      }),
    ];
    const result = filterTasksDueToday(rows, TEST_TZ, TUESDAY_10AM_NY);
    expect(result.map((t) => t.id)).toEqual([]);
  });

  it("includes weekly Mon/Wed task on Wednesday", () => {
    const rows = [
      makeRecurringTaskRow({
        id: "weekly",
        status: "todo",
        recurrenceType: "weekly",
        recurrenceDays: weeklyMonWed().recurrenceDays,
      }),
    ];
    const result = filterTasksDueToday(
      rows,
      TEST_TZ,
      new Date("2025-01-08T15:00:00.000Z"),
    );
    expect(result.map((t) => t.id)).toEqual(["weekly"]);
  });

  it("includes daily todo every calendar day", () => {
    const rows = [
      makeRecurringTaskRow({
        id: "daily",
        status: "todo",
        recurrenceType: "daily",
      }),
    ];
    expect(
      filterTasksDueToday(rows, TEST_TZ, TUESDAY_10AM_NY).map((t) => t.id),
    ).toEqual(["daily"]);
  });

  it("excludes daily done today", () => {
    const rows = [
      makeRecurringTaskRow({
        id: "daily-done",
        status: "done",
        completedAt: MONDAY_8PM_NY.toISOString(),
        recurrenceType: "daily",
      }),
    ];
    expect(
      filterTasksDueToday(rows, TEST_TZ, MONDAY_10AM_NY).map((t) => t.id),
    ).toEqual([]);
  });

  it("includes carryOver weekly Mon-only on Tuesday", () => {
    const rows = [
      makeRecurringTaskRow({
        id: "carry",
        status: "todo",
        recurrenceType: "weekly",
        recurrenceDays: weeklyMonOnly().recurrenceDays,
        recurrenceCarryOver: true,
      }),
    ];
    expect(
      filterTasksDueToday(rows, TEST_TZ, TUESDAY_10AM_NY).map((t) => t.id),
    ).toEqual(["carry"]);
  });

  it("excludes deferred tasks", () => {
    const rows = [
      makeRecurringTaskRow({ id: "deferred", status: "deferred" }),
    ];
    expect(
      filterTasksDueToday(rows, TEST_TZ, MONDAY_10AM_NY).map((t) => t.id),
    ).toEqual([]);
  });
});

describe("Today flow: pillar filter then rankAndLimit", () => {
  it("returns up to 5 tasks from the selected pillar due today", () => {
    const pool = [
      makeRecurringTaskRow({
        id: "w1",
        pillarId: "p-work",
        priorityScore: 0.9,
        status: "todo",
      }),
      makeRecurringTaskRow({
        id: "w2",
        pillarId: "p-work",
        priorityScore: 0.8,
        status: "todo",
      }),
      makeRecurringTaskRow({
        id: "h1",
        pillarId: "p-health",
        priorityScore: 1,
        status: "todo",
      }),
    ];

    const workOnly = filterTasksByPillar(pool, "p-work");
    expect(rankAndLimit(workOnly, 5).map((t) => t.id)).toEqual(["w1", "w2"]);
    expect(rankAndLimit(workOnly, 1).map((t) => t.id)).toEqual(["w1"]);
  });
});
