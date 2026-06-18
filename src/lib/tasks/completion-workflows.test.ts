import { describe, it, expect } from "vitest";
import {
  filterCompletionEvents,
  groupCompletionEventsByDate,
  shouldRecordCompletionTransition,
  summarizeCompletionEventsByPillar,
} from "./completion-events";
import {
  completionQueryForAlignmentWeek,
  completionQueryForPageRange,
  completionQueryForToday,
} from "./completion-ranges";
import {
  TEST_TZ,
  MONDAY_8PM_NY,
  WEDNESDAY_10AM_NY,
  makeCompletionEvent,
} from "./completion-test-helpers";

const weekEvents = [
  makeCompletionEvent({
    id: "mon",
    occurrenceDate: "2025-01-06",
    completedAt: MONDAY_8PM_NY.toISOString(),
    pillarId: "p-work",
    taskTitle: "LC",
  }),
  makeCompletionEvent({
    id: "wed",
    occurrenceDate: "2025-01-08",
    completedAt: WEDNESDAY_10AM_NY.toISOString(),
    pillarId: "p-health",
    taskTitle: "Run",
  }),
  makeCompletionEvent({
    id: "last-week",
    occurrenceDate: "2025-01-05",
    completedAt: "2025-01-05T20:00:00.000Z",
    pillarId: "p-work",
    taskTitle: "Old",
  }),
];

describe("Today completed fold workflow", () => {
  it("shows events whose occurrence_date is local today", () => {
    const mondayNightNy = new Date("2025-01-07T03:00:00.000Z");
    const query = completionQueryForToday(TEST_TZ, mondayNightNy);
    const today = filterCompletionEvents(weekEvents, query);
    expect(today.map((e) => e.id)).toEqual(["mon"]);
  });

  it("excludes yesterday completions after local midnight", () => {
    const query = completionQueryForToday(TEST_TZ, WEDNESDAY_10AM_NY);
    const today = filterCompletionEvents(weekEvents, query);
    expect(today.map((e) => e.id)).toEqual(["wed"]);
  });
});

describe("Completed page workflow", () => {
  it("week filter then groups by occurrence_date descending", () => {
    const query = completionQueryForPageRange("week", TEST_TZ, WEDNESDAY_10AM_NY)!;
    const filtered = filterCompletionEvents(weekEvents, query);
    const groups = groupCompletionEventsByDate(filtered);
    expect(groups.map((g) => g.date)).toEqual(["2025-01-08", "2025-01-06"]);
    expect(filtered.map((e) => e.id)).toEqual(["wed", "mon"]);
  });

  it("pillar filter narrows week results", () => {
    const query = {
      ...completionQueryForPageRange("week", TEST_TZ, WEDNESDAY_10AM_NY)!,
      pillarId: "p-work",
    };
    expect(filterCompletionEvents(weekEvents, query).map((e) => e.id)).toEqual([
      "mon",
    ]);
  });

  it("all range returns every event when since/until span history", () => {
    expect(
      completionQueryForPageRange("all", TEST_TZ, WEDNESDAY_10AM_NY),
    ).toBeNull();
    const filtered = filterCompletionEvents(weekEvents, {
      since: "2025-01-01",
      until: "2025-01-31",
    });
    expect(filtered).toHaveLength(3);
  });
});

describe("Alignment weekly wins workflow", () => {
  it("summarizes completions for the alignment week window", () => {
    const query = completionQueryForAlignmentWeek(TEST_TZ, WEDNESDAY_10AM_NY);
    const filtered = filterCompletionEvents(weekEvents, query);
    const summary = summarizeCompletionEventsByPillar(filtered, 3);
    expect(summary).toEqual(
      expect.arrayContaining([
        { pillarId: "p-work", count: 1, topTitles: ["LC"] },
        { pillarId: "p-health", count: 1, topTitles: ["Run"] },
      ]),
    );
    expect(filtered.map((e) => e.id)).toEqual(["wed", "mon"]);
  });
});

describe("Subtask auto-done completion workflow", () => {
  it("records one event when parent goes in_progress to done", () => {
    let status = "in_progress";
    const events: ReturnType<typeof makeCompletionEvent>[] = [];

    for (const next of ["done", "done"] as const) {
      if (shouldRecordCompletionTransition(status, next)) {
        events.push(
          makeCompletionEvent({
            id: "via-subtask",
            completedAt: MONDAY_8PM_NY.toISOString(),
            occurrenceDate: "2025-01-06",
          }),
        );
      }
      status = next;
    }

    expect(events).toHaveLength(1);
  });
});
