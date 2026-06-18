import { describe, it, expect } from "vitest";
import {
  planOccurrenceResets,
  subtaskIdsForResetPlan,
} from "./occurrence-reset-plan";
import {
  TEST_TZ,
  MONDAY_8PM_NY,
  TUESDAY_10AM_NY,
  WEDNESDAY_10AM_NY,
  weeklyMonWed,
} from "@/lib/tasks/recurrence-test-helpers";

describe("subtaskIdsForResetPlan", () => {
  it("returns done subtask ids only for parents in the reset plan", () => {
    const ids = subtaskIdsForResetPlan(
      ["parent-a"],
      [
        { id: "s-done", parentTaskId: "parent-a", isDone: true },
        { id: "s-open", parentTaskId: "parent-a", isDone: false },
        { id: "s-other", parentTaskId: "parent-b", isDone: true },
      ],
    );
    expect(ids).toEqual(["s-done"]);
  });

  it("returns empty when plan is empty", () => {
    expect(
      subtaskIdsForResetPlan(
        [],
        [{ id: "s1", parentTaskId: "p1", isDone: true }],
      ),
    ).toEqual([]);
  });
});

describe("planOccurrenceResets", () => {
  it("returns empty when no tasks need reset", () => {
    expect(
      planOccurrenceResets(
        [
          {
            id: "todo",
            ...weeklyMonWed({ status: "todo" }),
          },
        ],
        TEST_TZ,
        WEDNESDAY_10AM_NY,
      ),
    ).toEqual([]);
  });

  it("includes weekly task done on Monday when now is Wednesday", () => {
    const plan = planOccurrenceResets(
      [
        {
          id: "weekly-1",
          ...weeklyMonWed({
            status: "done",
            completedAt: MONDAY_8PM_NY.toISOString(),
          }),
        },
      ],
      TEST_TZ,
      WEDNESDAY_10AM_NY,
    );
    expect(plan).toEqual(["weekly-1"]);
  });

  it("excludes todo tasks even on schedule days", () => {
    expect(
      planOccurrenceResets(
        [
          {
            id: "weekly-todo",
            ...weeklyMonWed({ status: "todo" }),
          },
        ],
        TEST_TZ,
        WEDNESDAY_10AM_NY,
      ),
    ).toEqual([]);
  });

  it("is idempotent after virtual post-reset state", () => {
    const before = planOccurrenceResets(
      [
        {
          id: "weekly-1",
          ...weeklyMonWed({
            status: "done",
            completedAt: MONDAY_8PM_NY.toISOString(),
          }),
        },
      ],
      TEST_TZ,
      WEDNESDAY_10AM_NY,
    );
    expect(before).toEqual(["weekly-1"]);

    const afterReset = planOccurrenceResets(
      [
        {
          id: "weekly-1",
          ...weeklyMonWed({
            status: "todo",
            completedAt: null,
          }),
        },
      ],
      TEST_TZ,
      WEDNESDAY_10AM_NY,
    );
    expect(afterReset).toEqual([]);
  });

  it("does not reset done task on non-schedule Tuesday", () => {
    expect(
      planOccurrenceResets(
        [
          {
            id: "weekly-1",
            ...weeklyMonWed({
              status: "done",
              completedAt: MONDAY_8PM_NY.toISOString(),
            }),
          },
        ],
        TEST_TZ,
        TUESDAY_10AM_NY,
      ),
    ).toEqual([]);
  });
});
