import { describe, it, expect } from "vitest";
import {
  isCompletedForToday,
  isOccurrenceOverdue,
  lastScheduledOnOrBefore,
  matchesRecurrenceDay,
  needsOccurrenceReset,
  nextScheduledAfter,
  shouldShowOnToday,
  virtualDeadlineForPriority,
} from "./recurrence";
import { startOfLocalDay } from "./timezone";
import {
  TEST_TZ,
  MONDAY_10AM_NY,
  MONDAY_8PM_NY,
  TUESDAY_10AM_NY,
  WEDNESDAY_10AM_NY,
  FIFTEENTH_10AM_NY,
  FEB_FIFTEENTH_10AM_NY,
  FEB_LAST_10AM_NY,
  APR_FIFTEENTH_10AM_NY,
  MAY_FIFTEENTH_10AM_NY,
  dailyTask,
  makeRecurrenceTask,
  monthlyOnDay,
  quarterlyOnDay,
  weeklyMonOnly,
  weeklyMonWed,
} from "./recurrence-test-helpers";

describe("matchesRecurrenceDay", () => {
  it("returns false for none", () => {
    expect(
      matchesRecurrenceDay(makeRecurrenceTask(), MONDAY_10AM_NY, TEST_TZ),
    ).toBe(false);
  });

  it("returns true every day for daily", () => {
    expect(matchesRecurrenceDay(dailyTask(), TUESDAY_10AM_NY, TEST_TZ)).toBe(
      true,
    );
  });

  it("returns true only on selected weekdays for weekly", () => {
    const task = weeklyMonWed();
    expect(matchesRecurrenceDay(task, MONDAY_10AM_NY, TEST_TZ)).toBe(true);
    expect(matchesRecurrenceDay(task, TUESDAY_10AM_NY, TEST_TZ)).toBe(false);
    expect(matchesRecurrenceDay(task, WEDNESDAY_10AM_NY, TEST_TZ)).toBe(true);
  });
});

describe("shouldShowOnToday", () => {
  it("one-off todo is shown; done is hidden", () => {
    expect(
      shouldShowOnToday(
        makeRecurrenceTask({ status: "todo" }),
        MONDAY_10AM_NY,
        TEST_TZ,
      ),
    ).toBe(true);
    expect(
      shouldShowOnToday(
        makeRecurrenceTask({ status: "in_progress" }),
        MONDAY_10AM_NY,
        TEST_TZ,
      ),
    ).toBe(true);
    expect(
      shouldShowOnToday(
        makeRecurrenceTask({ status: "done" }),
        MONDAY_10AM_NY,
        TEST_TZ,
      ),
    ).toBe(false);
  });

  it("daily: hides when completed today; shows next calendar day when todo", () => {
    const doneToday = dailyTask({
      status: "done",
      completedAt: MONDAY_8PM_NY.toISOString(),
    });
    expect(shouldShowOnToday(doneToday, MONDAY_8PM_NY, TEST_TZ)).toBe(false);
    expect(shouldShowOnToday(doneToday, TUESDAY_10AM_NY, TEST_TZ)).toBe(true);

    expect(shouldShowOnToday(dailyTask(), TUESDAY_10AM_NY, TEST_TZ)).toBe(true);
  });

  it("weekly Mon/Wed: hidden on Tuesday", () => {
    const task = weeklyMonWed({ status: "todo" });
    expect(shouldShowOnToday(task, TUESDAY_10AM_NY, TEST_TZ)).toBe(false);
  });

  it("weekly Mon/Wed: hidden on Monday after complete; shows on Wednesday", () => {
    const doneMonday = weeklyMonWed({
      status: "done",
      completedAt: MONDAY_8PM_NY.toISOString(),
    });
    expect(shouldShowOnToday(doneMonday, MONDAY_8PM_NY, TEST_TZ)).toBe(false);
    expect(shouldShowOnToday(doneMonday, TUESDAY_10AM_NY, TEST_TZ)).toBe(
      false,
    );
    expect(shouldShowOnToday(doneMonday, WEDNESDAY_10AM_NY, TEST_TZ)).toBe(
      true,
    );
  });

  it("weekly Mon/Wed: Mon todo shows on Wed without carryOver", () => {
    const task = weeklyMonWed({ status: "todo" });
    expect(shouldShowOnToday(task, WEDNESDAY_10AM_NY, TEST_TZ)).toBe(true);
  });

  it("carryOver weekly Mon-only: Mon todo shows on Tuesday", () => {
    const task = weeklyMonOnly({
      status: "todo",
      recurrenceCarryOver: true,
    });
    expect(shouldShowOnToday(task, TUESDAY_10AM_NY, TEST_TZ)).toBe(true);
  });

  it("weekly Mon-only without carryOver: Mon todo hidden on Tuesday", () => {
    const task = weeklyMonOnly({ status: "todo" });
    expect(shouldShowOnToday(task, TUESDAY_10AM_NY, TEST_TZ)).toBe(false);
  });
});

describe("needsOccurrenceReset", () => {
  it("never resets todo tasks", () => {
    expect(
      needsOccurrenceReset(dailyTask(), WEDNESDAY_10AM_NY, TEST_TZ),
    ).toBe(false);
    expect(
      needsOccurrenceReset(
        weeklyMonWed({ status: "todo" }),
        WEDNESDAY_10AM_NY,
        TEST_TZ,
      ),
    ).toBe(false);
  });

  it("daily: resets done task on next calendar day", () => {
    const doneYesterday = dailyTask({
      status: "done",
      completedAt: MONDAY_8PM_NY.toISOString(),
    });
    expect(
      needsOccurrenceReset(doneYesterday, MONDAY_8PM_NY, TEST_TZ),
    ).toBe(false);
    expect(
      needsOccurrenceReset(doneYesterday, TUESDAY_10AM_NY, TEST_TZ),
    ).toBe(true);
  });

  it("weekly Mon/Wed: resets done Monday task on Wednesday", () => {
    const doneMonday = weeklyMonWed({
      status: "done",
      completedAt: MONDAY_8PM_NY.toISOString(),
    });
    expect(needsOccurrenceReset(doneMonday, TUESDAY_10AM_NY, TEST_TZ)).toBe(
      false,
    );
    expect(needsOccurrenceReset(doneMonday, WEDNESDAY_10AM_NY, TEST_TZ)).toBe(
      true,
    );
  });
});

describe("isOccurrenceOverdue", () => {
  it("is false when done for the current occurrence window", () => {
    const task = weeklyMonOnly({
      status: "todo",
      completedAt: MONDAY_8PM_NY.toISOString(),
    });
    expect(isOccurrenceOverdue(task, TUESDAY_10AM_NY, TEST_TZ)).toBe(false);
  });

  it("is true for carryOver weekly when Mon todo on Tuesday", () => {
    const task = weeklyMonOnly({
      status: "todo",
      recurrenceCarryOver: true,
    });
    expect(isOccurrenceOverdue(task, TUESDAY_10AM_NY, TEST_TZ)).toBe(true);
  });
});

describe("nextScheduledAfter", () => {
  it("returns null for non-recurring tasks", () => {
    expect(
      nextScheduledAfter(makeRecurrenceTask(), MONDAY_10AM_NY, TEST_TZ),
    ).toBeNull();
  });

  it("Mon/Wed done on Monday viewed Tuesday → next Wednesday local midnight", () => {
    const doneMonday = weeklyMonWed({
      status: "done",
      completedAt: MONDAY_8PM_NY.toISOString(),
    });
    const next = nextScheduledAfter(doneMonday, TUESDAY_10AM_NY, TEST_TZ);
    expect(next).not.toBeNull();
    expect(next!.toISOString()).toBe(
      startOfLocalDay(WEDNESDAY_10AM_NY, TEST_TZ).toISOString(),
    );
  });

  it("daily done yesterday → next occurrence is today local midnight", () => {
    const doneYesterday = dailyTask({
      status: "done",
      completedAt: MONDAY_8PM_NY.toISOString(),
    });
    const next = nextScheduledAfter(doneYesterday, TUESDAY_10AM_NY, TEST_TZ);
    expect(next!.toISOString()).toBe(
      startOfLocalDay(TUESDAY_10AM_NY, TEST_TZ).toISOString(),
    );
  });
});

describe("virtualDeadlineForPriority", () => {
  it("returns null for non-recurring tasks", () => {
    expect(
      virtualDeadlineForPriority(
        makeRecurrenceTask(),
        MONDAY_10AM_NY,
        TEST_TZ,
      ),
    ).toBeNull();
  });

  it("returns null for recurring todo on non-due day (backlog)", () => {
    const task = weeklyMonWed({ status: "todo" });
    expect(
      virtualDeadlineForPriority(task, TUESDAY_10AM_NY, TEST_TZ),
    ).toBeNull();
  });

  it("returns end of local day for recurring todo on due day", () => {
    const task = weeklyMonWed({ status: "todo" });
    const deadline = virtualDeadlineForPriority(
      task,
      MONDAY_10AM_NY,
      TEST_TZ,
    );
    expect(deadline).not.toBeNull();
    expect(deadline!.getTime()).toBeGreaterThan(MONDAY_10AM_NY.getTime());
  });

  it("returns end of local day for carryOver overdue on non-schedule day", () => {
    const task = weeklyMonOnly({
      status: "todo",
      recurrenceCarryOver: true,
    });
    expect(
      virtualDeadlineForPriority(task, TUESDAY_10AM_NY, TEST_TZ),
    ).not.toBeNull();
  });
});

describe("isCompletedForToday", () => {
  it("returns false for todo one-off", () => {
    expect(
      isCompletedForToday(
        makeRecurrenceTask({ status: "todo" }),
        MONDAY_10AM_NY,
        TEST_TZ,
      ),
    ).toBe(false);
  });

  it("returns true for daily done today", () => {
    expect(
      isCompletedForToday(
        dailyTask({
          status: "done",
          completedAt: MONDAY_8PM_NY.toISOString(),
        }),
        MONDAY_8PM_NY,
        TEST_TZ,
      ),
    ).toBe(true);
  });

  it("returns false for daily done yesterday when viewed today", () => {
    expect(
      isCompletedForToday(
        dailyTask({
          status: "done",
          completedAt: MONDAY_8PM_NY.toISOString(),
        }),
        TUESDAY_10AM_NY,
        TEST_TZ,
      ),
    ).toBe(false);
  });

  it("returns false for weekly Mon done on Monday when viewed Wednesday before reset", () => {
    expect(
      isCompletedForToday(
        weeklyMonWed({
          status: "done",
          completedAt: MONDAY_8PM_NY.toISOString(),
        }),
        WEDNESDAY_10AM_NY,
        TEST_TZ,
      ),
    ).toBe(false);
  });
});

describe("lastScheduledOnOrBefore", () => {
  it("returns null for non-recurring tasks", () => {
    expect(
      lastScheduledOnOrBefore(
        makeRecurrenceTask(),
        WEDNESDAY_10AM_NY,
        TEST_TZ,
      ),
    ).toBeNull();
  });

  it("returns today local midnight for daily on any day", () => {
    const last = lastScheduledOnOrBefore(
      dailyTask(),
      TUESDAY_10AM_NY,
      TEST_TZ,
    );
    expect(last!.toISOString()).toBe(
      startOfLocalDay(TUESDAY_10AM_NY, TEST_TZ).toISOString(),
    );
  });

  it("returns Wednesday midnight when viewing Wednesday for Mon/Wed weekly", () => {
    const last = lastScheduledOnOrBefore(
      weeklyMonWed(),
      WEDNESDAY_10AM_NY,
      TEST_TZ,
    );
    expect(last!.toISOString()).toBe(
      startOfLocalDay(WEDNESDAY_10AM_NY, TEST_TZ).toISOString(),
    );
  });

  it("returns Tuesday midnight for carryOver weekly Mon-only on Tuesday", () => {
    const last = lastScheduledOnOrBefore(
      weeklyMonOnly({ recurrenceCarryOver: true }),
      TUESDAY_10AM_NY,
      TEST_TZ,
    );
    expect(last!.toISOString()).toBe(
      startOfLocalDay(MONDAY_10AM_NY, TEST_TZ).toISOString(),
    );
  });
});

describe("monthly recurrence", () => {
  it("matches only on the configured day of month", () => {
    const task = monthlyOnDay(15);
    expect(matchesRecurrenceDay(task, FIFTEENTH_10AM_NY, TEST_TZ)).toBe(true);
    expect(matchesRecurrenceDay(task, TUESDAY_10AM_NY, TEST_TZ)).toBe(false);
  });

  it("shows on today when due and not completed this cycle", () => {
    expect(
      shouldShowOnToday(monthlyOnDay(15), FIFTEENTH_10AM_NY, TEST_TZ),
    ).toBe(true);
  });

  it("hides on the same day after completion and between occurrences", () => {
    const doneThisMonth = monthlyOnDay(15, {
      status: "done",
      completedAt: FIFTEENTH_10AM_NY.toISOString(),
    });
    expect(
      shouldShowOnToday(doneThisMonth, FIFTEENTH_10AM_NY, TEST_TZ),
    ).toBe(false);
    expect(shouldShowOnToday(doneThisMonth, TUESDAY_10AM_NY, TEST_TZ)).toBe(false);
  });

  it("resets on the next month occurrence", () => {
    const doneLastMonth = monthlyOnDay(15, {
      status: "done",
      completedAt: FIFTEENTH_10AM_NY.toISOString(),
    });
    expect(
      needsOccurrenceReset(doneLastMonth, FEB_FIFTEENTH_10AM_NY, TEST_TZ),
    ).toBe(true);
  });

  it("uses the last day of short months when scheduled on the 31st", () => {
    const task = monthlyOnDay(31);
    expect(matchesRecurrenceDay(task, FEB_LAST_10AM_NY, TEST_TZ)).toBe(true);
    expect(
      matchesRecurrenceDay(task, FEB_FIFTEENTH_10AM_NY, TEST_TZ),
    ).toBe(false);
  });
});

describe("quarterly recurrence", () => {
  it("matches only on the configured day in quarter-start months (slot 1)", () => {
    const task = quarterlyOnDay(15, 1);
    expect(matchesRecurrenceDay(task, FIFTEENTH_10AM_NY, TEST_TZ)).toBe(true);
    expect(matchesRecurrenceDay(task, APR_FIFTEENTH_10AM_NY, TEST_TZ)).toBe(true);
    expect(matchesRecurrenceDay(task, FEB_FIFTEENTH_10AM_NY, TEST_TZ)).toBe(false);
  });

  it("matches slot 2 months (Feb, May, Aug, Nov)", () => {
    const task = quarterlyOnDay(15, 2);
    expect(matchesRecurrenceDay(task, FEB_FIFTEENTH_10AM_NY, TEST_TZ)).toBe(true);
    expect(matchesRecurrenceDay(task, MAY_FIFTEENTH_10AM_NY, TEST_TZ)).toBe(true);
    expect(matchesRecurrenceDay(task, FIFTEENTH_10AM_NY, TEST_TZ)).toBe(false);
  });

  it("supports legacy single-day encoding as slot 1", () => {
    const task = quarterlyOnDay(15);
    expect(matchesRecurrenceDay(task, FIFTEENTH_10AM_NY, TEST_TZ)).toBe(true);
  });

  it("shows on today when due and not completed this cycle", () => {
    expect(
      shouldShowOnToday(quarterlyOnDay(15, 1), FIFTEENTH_10AM_NY, TEST_TZ),
    ).toBe(true);
  });

  it("resets on the next quarter occurrence", () => {
    const doneThisQuarter = quarterlyOnDay(15, 1, {
      status: "done",
      completedAt: FIFTEENTH_10AM_NY.toISOString(),
    });
    expect(
      needsOccurrenceReset(doneThisQuarter, APR_FIFTEENTH_10AM_NY, TEST_TZ),
    ).toBe(true);
  });
});
