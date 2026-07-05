import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  buildWeekDays,
  isUnscheduledTask,
  parseCalendarUrlState,
  startAtForCalendarDay,
  stepCalendarAnchor,
  taskAppearsOnDay,
} from "./calendar";
import { localDateTimeInputToIso, addLocalDays } from "./timezone";
import {
  MONDAY_10AM_NY,
  TUESDAY_10AM_NY,
  TEST_TZ,
  WEDNESDAY_10AM_NY,
  dailyTask,
  weeklyMonOnly,
} from "./recurrence-test-helpers";
import { makeTask } from "@/lib/test-fixtures";

describe("isUnscheduledTask", () => {
  it("is true for active one-off without startAt", () => {
    expect(
      isUnscheduledTask(
        makeTask({ recurrenceType: "none", startAt: null, status: "todo" }),
        TEST_TZ,
      ),
    ).toBe(true);
  });

  it("is false when startAt is set", () => {
    expect(
      isUnscheduledTask(
        makeTask({
          recurrenceType: "none",
          startAt: localDateTimeInputToIso("2025-01-06T09:00", TEST_TZ),
          status: "todo",
        }),
        TEST_TZ,
      ),
    ).toBe(false);
  });

  it("is false for recurring tasks even without startAt", () => {
    expect(
      isUnscheduledTask(
        makeTask({
          recurrenceType: "daily",
          startAt: null,
          status: "todo",
        }),
        TEST_TZ,
      ),
    ).toBe(false);
  });

  it("is false for done tasks", () => {
    expect(
      isUnscheduledTask(
        makeTask({ recurrenceType: "none", startAt: null, status: "done" }),
        TEST_TZ,
      ),
    ).toBe(false);
  });
});

describe("taskAppearsOnDay", () => {
  it("shows one-off only on its startAt local day", () => {
    const task = makeTask({
      recurrenceType: "none",
      startAt: localDateTimeInputToIso("2025-01-06T09:00", TEST_TZ),
      status: "todo",
    });
    expect(taskAppearsOnDay(task, MONDAY_10AM_NY, TEST_TZ)).toBe(true);
    expect(taskAppearsOnDay(task, TUESDAY_10AM_NY, TEST_TZ)).toBe(false);
  });

  it("hides one-off without startAt from calendar cells", () => {
    const task = makeTask({
      recurrenceType: "none",
      startAt: null,
      status: "todo",
    });
    expect(taskAppearsOnDay(task, MONDAY_10AM_NY, TEST_TZ)).toBe(false);
  });

  it("shows daily recurring every day while todo", () => {
    const task = makeTask({
      ...dailyTask(),
      id: "daily",
    });
    expect(taskAppearsOnDay(task, MONDAY_10AM_NY, TEST_TZ)).toBe(true);
    expect(taskAppearsOnDay(task, TUESDAY_10AM_NY, TEST_TZ)).toBe(true);
  });

  it("includes weekly carry-over overdue on Tuesday", () => {
    const task = makeTask({
      ...weeklyMonOnly({ status: "todo", recurrenceCarryOver: true }),
      id: "weekly-carry",
    });
    expect(taskAppearsOnDay(task, TUESDAY_10AM_NY, TEST_TZ)).toBe(true);
  });

  it("shows done one-off on its scheduled day", () => {
    expect(
      taskAppearsOnDay(
        makeTask({
          status: "done",
          startAt: localDateTimeInputToIso("2025-01-06T09:00", TEST_TZ),
        }),
        MONDAY_10AM_NY,
        TEST_TZ,
      ),
    ).toBe(true);
  });

  it("shows done daily recurring on matching days", () => {
    const task = makeTask({
      ...dailyTask(),
      status: "done",
      id: "daily-done",
    });
    expect(taskAppearsOnDay(task, MONDAY_10AM_NY, TEST_TZ)).toBe(true);
    expect(taskAppearsOnDay(task, TUESDAY_10AM_NY, TEST_TZ)).toBe(true);
  });
});

describe("buildWeekDays", () => {
  it("returns seven days starting Monday for a mid-week anchor", () => {
    const days = buildWeekDays(WEDNESDAY_10AM_NY, TEST_TZ);
    expect(days).toHaveLength(7);
    expect(days[0]?.dateStr).toBe("2025-01-06");
    expect(days[6]?.dateStr).toBe("2025-01-12");
  });
});

describe("buildMonthGrid", () => {
  it("returns six rows of seven days for January 2025", () => {
    const rows = buildMonthGrid(MONDAY_10AM_NY, TEST_TZ);
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.length === 7)).toBe(true);
    const inMonth = rows.flat().filter((cell) => cell.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth.some((cell) => cell.dateStr === "2025-01-01")).toBe(true);
    expect(inMonth.some((cell) => cell.dateStr === "2025-01-31")).toBe(true);
  });

  it("marks leading/trailing days outside the month", () => {
    const rows = buildMonthGrid(MONDAY_10AM_NY, TEST_TZ);
    const all = rows.flat();
    expect(all.some((cell) => !cell.inMonth && cell.dateStr.startsWith("2024-12"))).toBe(
      true,
    );
  });
});

describe("startAtForCalendarDay", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(startAtForCalendarDay("2025-01-06")).toBe("2025-01-06");
  });

  it("rejects invalid values", () => {
    expect(startAtForCalendarDay("2025/01/06")).toBeNull();
  });
});

describe("parseCalendarUrlState", () => {
  it("defaults to week view and today anchor", () => {
    const now = new Date("2025-01-08T15:00:00.000Z");
    const state = parseCalendarUrlState(new URLSearchParams(), TEST_TZ, now);
    expect(state.view).toBe("week");
    expect(state.anchorDateStr).toBe("2025-01-08");
  });

  it("parses month view and date query", () => {
    const state = parseCalendarUrlState(
      new URLSearchParams("view=month&date=2025-01-15"),
      TEST_TZ,
    );
    expect(state.view).toBe("month");
    expect(state.anchorDateStr).toBe("2025-01-15");
  });
});

describe("stepCalendarAnchor", () => {
  it("steps week view by seven days", () => {
    const next = stepCalendarAnchor(MONDAY_10AM_NY, "week", "next", TEST_TZ);
    expect(next.toISOString()).toBe(
      addLocalDays(MONDAY_10AM_NY, TEST_TZ, 7).toISOString(),
    );
  });

  it("steps month view to the next month start", () => {
    const next = stepCalendarAnchor(MONDAY_10AM_NY, "month", "next", TEST_TZ);
    expect(next.toISOString()).toBe(
      localDateTimeInputToIso("2025-02-01T00:00", TEST_TZ)!,
    );
  });

  it("steps month view backward to previous month start", () => {
    const prev = stepCalendarAnchor(MONDAY_10AM_NY, "month", "prev", TEST_TZ);
    expect(prev.toISOString()).toBe(
      localDateTimeInputToIso("2024-12-01T00:00", TEST_TZ)!,
    );
  });
});

describe("DST boundaries", () => {
  it("buildWeekDays spans spring-forward week without dropping a day", () => {
    const springForwardMonday = new Date("2025-03-10T14:00:00.000Z");
    const days = buildWeekDays(springForwardMonday, TEST_TZ);
    expect(days.map((d) => d.dateStr)).toEqual([
      "2025-03-10",
      "2025-03-11",
      "2025-03-12",
      "2025-03-13",
      "2025-03-14",
      "2025-03-15",
      "2025-03-16",
    ]);
  });
});
