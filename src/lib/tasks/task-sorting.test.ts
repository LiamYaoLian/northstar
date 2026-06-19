import { describe, it, expect } from "vitest";
import {
  filterTasksByStatus,
  filterTasksDueToday,
  sortDoneTasksByCompletedAt,
  sortTasksByTime,
} from "./task-sorting";
import { makeTask } from "@/lib/test-fixtures";
import {
  TEST_TZ,
  MONDAY_10AM_NY,
  MONDAY_8PM_NY,
  TUESDAY_10AM_NY,
  makeRecurringTaskRow,
  weeklyMonOnly,
  weeklyMonWed,
} from "@/lib/tasks/recurrence-test-helpers";

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
});

describe("filterTasksByStatus", () => {
  const rows = [
    makeTask({ id: "open", status: "todo" }),
    makeTask({ id: "wip", status: "in_progress" }),
    makeTask({
      id: "closed",
      status: "done",
      completedAt: "2025-01-07T01:00:00.000Z",
    }),
  ];

  it("active excludes done tasks (default Tasks tab)", () => {
    expect(filterTasksByStatus(rows, "active").map((t) => t.id)).toEqual([
      "open",
      "wip",
    ]);
  });

  it("done includes only done tasks", () => {
    expect(filterTasksByStatus(rows, "done").map((t) => t.id)).toEqual([
      "closed",
    ]);
  });

  it("all returns every task", () => {
    expect(filterTasksByStatus(rows, "all")).toHaveLength(3);
  });
});

describe("sortTasksByTime", () => {
  it("sorts by startAt ascending with unscheduled tasks last", () => {
    const sorted = sortTasksByTime([
      makeTask({
        id: "late",
        startAt: "2025-01-08T10:00:00.000Z",
      }),
      makeTask({
        id: "early",
        startAt: "2025-01-06T10:00:00.000Z",
      }),
      makeTask({
        id: "none",
        startAt: null,
        dueAt: null,
      }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["early", "late", "none"]);
  });

  it("falls back to dueAt when startAt is missing", () => {
    const sorted = sortTasksByTime([
      makeTask({
        id: "due-later",
        startAt: null,
        dueAt: "2025-01-10",
      }),
      makeTask({
        id: "due-soon",
        startAt: null,
        dueAt: "2025-01-07",
      }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["due-soon", "due-later"]);
  });

  it("uses id as tie-breaker for the same time", () => {
    const sorted = sortTasksByTime([
      makeTask({
        id: "aaa",
        startAt: "2025-01-06T10:00:00.000Z",
      }),
      makeTask({
        id: "bbb",
        startAt: "2025-01-06T10:00:00.000Z",
      }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["aaa", "bbb"]);
  });
});

describe("sortDoneTasksByCompletedAt", () => {
  it("sorts done tasks by completedAt descending", () => {
    const sorted = sortDoneTasksByCompletedAt([
      makeTask({
        id: "old",
        status: "done",
        completedAt: "2025-01-06T01:00:00.000Z",
      }),
      makeTask({
        id: "new",
        status: "done",
        completedAt: "2025-01-08T01:00:00.000Z",
      }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["new", "old"]);
  });

  it("treats null completedAt as oldest", () => {
    const sorted = sortDoneTasksByCompletedAt([
      makeTask({ id: "no-date", status: "done", completedAt: null }),
      makeTask({
        id: "dated",
        status: "done",
        completedAt: "2025-01-08T01:00:00.000Z",
      }),
    ]);
    expect(sorted[0]!.id).toBe("dated");
  });
});

describe("Tasks done tab workflow", () => {
  it("filters done then sorts by completedAt for display", () => {
    const rows = [
      makeTask({ id: "open", status: "todo" }),
      makeTask({
        id: "done-old",
        status: "done",
        completedAt: "2025-01-06T01:00:00.000Z",
      }),
      makeTask({
        id: "done-new",
        status: "done",
        completedAt: "2025-01-08T01:00:00.000Z",
      }),
    ];
    const done = sortDoneTasksByCompletedAt(filterTasksByStatus(rows, "done"));
    expect(done.map((t) => t.id)).toEqual(["done-new", "done-old"]);
  });
});
