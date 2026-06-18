import { describe, it, expect } from "vitest";
import { computeTaskPriority } from "./index";
import { virtualDeadlineForPriority } from "@/lib/tasks/recurrence";
import { endOfLocalDay } from "@/lib/tasks/timezone";
import { makeTask, testPillars } from "@/lib/test-fixtures";
import {
  TEST_TZ,
  MONDAY_10AM_NY,
  TUESDAY_10AM_NY,
  weeklyMonWed,
} from "@/lib/tasks/recurrence-test-helpers";

describe("recurring virtual deadline (priority integration target)", () => {
  it("due-today recurring task gets higher deadline pressure than backlog recurring", () => {
    const dueToday = {
      ...weeklyMonWed({ status: "todo" }),
      id: "due-today",
    };
    const backlog = {
      ...weeklyMonWed({ status: "todo" }),
      id: "backlog",
    };

    const dueDeadline = virtualDeadlineForPriority(
      dueToday,
      MONDAY_10AM_NY,
      TEST_TZ,
    );
    const backlogDeadline = virtualDeadlineForPriority(
      backlog,
      TUESDAY_10AM_NY,
      TEST_TZ,
    );

    expect(dueDeadline).not.toBeNull();
    expect(backlogDeadline).toBeNull();

    const dueResult = computeTaskPriority(
      makeTask({
        id: "due-today",
        dueAt: dueDeadline!.toISOString(),
      }),
      testPillars,
      new Map(),
      0,
      "进大厂",
      [],
      MONDAY_10AM_NY,
    );
    const backlogResult = computeTaskPriority(
      makeTask({ id: "backlog", dueAt: null }),
      testPillars,
      new Map(),
      0,
      "进大厂",
      [],
      TUESDAY_10AM_NY,
    );

    expect(dueResult.factors.deadlinePressure).toBeGreaterThan(
      backlogResult.factors.deadlinePressure,
    );
  });

  it("virtual deadline for due day equals end of local day", () => {
    const task = weeklyMonWed({ status: "todo" });
    const deadline = virtualDeadlineForPriority(
      task,
      MONDAY_10AM_NY,
      TEST_TZ,
    );
    expect(deadline!.toISOString()).toBe(
      endOfLocalDay(MONDAY_10AM_NY, TEST_TZ).toISOString(),
    );
  });
});
