import { describe, it, expect } from "vitest";
import {
  buildCompletionEventPayload,
  computeOccurrenceDate,
  filterCompletionEvents,
  groupCompletionEventsByDate,
  resolvePillarSnapshotForCompletion,
  shouldRecordCompletionTransition,
  summarizeCompletionEventsByPillar,
} from "./completion-events";
import { filterTasksByStatus } from "@/lib/services/task-sorting";
import { testPillars } from "@/lib/test-fixtures";
import {
  TEST_TZ,
  MONDAY_10AM_NY,
  MONDAY_8PM_NY,
  TUESDAY_10AM_NY,
  WEDNESDAY_10AM_NY,
  makeCompletionEvent,
  makeTaskForCompletion,
  pillarSnapshot,
  weeklyMonOnly,
  weeklyMonWed,
} from "./completion-test-helpers";
import { makeTask } from "@/lib/test-fixtures";
import { toRecurrenceFields } from "./recurrence-types";

describe("shouldRecordCompletionTransition", () => {
  it("returns true when transitioning todo to done", () => {
    expect(shouldRecordCompletionTransition("todo", "done")).toBe(true);
  });

  it("returns true when transitioning in_progress to done", () => {
    expect(shouldRecordCompletionTransition("in_progress", "done")).toBe(true);
  });

  it("returns false when already done", () => {
    expect(shouldRecordCompletionTransition("done", "done")).toBe(false);
  });

  it("returns false when reopening done to todo", () => {
    expect(shouldRecordCompletionTransition("done", "todo")).toBe(false);
  });

  it("returns false for non-done updates", () => {
    expect(shouldRecordCompletionTransition("todo", "in_progress")).toBe(false);
  });

  it("returns true when transitioning deferred to done", () => {
    expect(shouldRecordCompletionTransition("deferred", "done")).toBe(true);
  });
});

describe("computeOccurrenceDate", () => {
  it("uses local completion day for one-off tasks", () => {
    const task = makeTaskForCompletion({ recurrenceType: "none" });
    expect(
      computeOccurrenceDate(task, TEST_TZ, MONDAY_8PM_NY),
    ).toBe("2025-01-06");
  });

  it("uses local completion day for daily tasks", () => {
    const task = makeTaskForCompletion({
      recurrenceType: "daily",
      completedAt: TUESDAY_10AM_NY.toISOString(),
    });
    expect(
      computeOccurrenceDate(task, TEST_TZ, TUESDAY_10AM_NY),
    ).toBe("2025-01-07");
  });

  it("uses schedule day for weekly Mon/Wed completed on Wednesday", () => {
    const fields = weeklyMonWed({
      status: "done",
      completedAt: WEDNESDAY_10AM_NY.toISOString(),
    });
    const task = makeTaskForCompletion({
      recurrenceType: "weekly",
      recurrenceDays: fields.recurrenceDays,
      completedAt: WEDNESDAY_10AM_NY.toISOString(),
    });
    expect(
      computeOccurrenceDate(task, TEST_TZ, WEDNESDAY_10AM_NY),
    ).toBe("2025-01-08");
  });

  it("uses last scheduled day for weekly carry-over done on Tuesday", () => {
    const fields = weeklyMonOnly({
      status: "done",
      recurrenceCarryOver: true,
      completedAt: TUESDAY_10AM_NY.toISOString(),
    });
    const task = makeTaskForCompletion({
      recurrenceType: "weekly",
      recurrenceDays: fields.recurrenceDays,
      recurrenceCarryOver: true,
      completedAt: TUESDAY_10AM_NY.toISOString(),
    });
    expect(
      computeOccurrenceDate(task, TEST_TZ, TUESDAY_10AM_NY),
    ).toBe("2025-01-06");
  });

  it("maps NY late evening to local calendar day not UTC day", () => {
    const mondayNightNy = new Date("2025-01-07T03:00:00.000Z"); // Mon ~10pm NY
    const task = makeTaskForCompletion({
      recurrenceType: "none",
      completedAt: mondayNightNy.toISOString(),
    });
    expect(
      computeOccurrenceDate(task, TEST_TZ, mondayNightNy),
    ).toBe("2025-01-06");
  });

  it("uses Monday schedule day when weekly task completed on Monday", () => {
    const task = makeTaskForCompletion({
      recurrenceType: "weekly",
      recurrenceDays: weeklyMonWed().recurrenceDays,
      completedAt: MONDAY_8PM_NY.toISOString(),
    });
    expect(
      computeOccurrenceDate(task, TEST_TZ, MONDAY_8PM_NY),
    ).toBe("2025-01-06");
  });
});

describe("buildCompletionEventPayload", () => {
  it("snapshots task and pillar fields", () => {
    const task = makeTaskForCompletion({
      title: "Morning run",
      pillarId: "p-health",
      focusTrack: null,
      recurrenceType: "daily",
    });
    const payload = buildCompletionEventPayload(
      task,
      TEST_TZ,
      MONDAY_8PM_NY,
      { pillarName: "健康", pillarColor: "#22c55e" },
      "ce-new",
      "2025-01-06T20:00:00.000Z",
    );
    expect(payload).toMatchObject({
      id: "ce-new",
      taskId: task.id,
      taskTitle: "Morning run",
      pillarId: "p-health",
      pillarName: "健康",
      pillarColor: "#22c55e",
      focusTrack: null,
      recurrenceType: "daily",
      occurrenceDate: "2025-01-06",
      completedAt: MONDAY_8PM_NY.toISOString(),
    });
  });

  it("derives occurrence_date via computeOccurrenceDate for weekly tasks", () => {
    const fields = toRecurrenceFields(
      weeklyMonWed({
        status: "done",
        completedAt: MONDAY_8PM_NY.toISOString(),
      }),
    );
    const task = makeTaskForCompletion({
      recurrenceType: fields.recurrenceType,
      recurrenceDays: fields.recurrenceDays,
      completedAt: MONDAY_8PM_NY.toISOString(),
    });
    const payload = buildCompletionEventPayload(
      task,
      TEST_TZ,
      MONDAY_8PM_NY,
      pillarSnapshot,
      "ce-weekly",
      MONDAY_8PM_NY.toISOString(),
    );
    expect(payload.occurrenceDate).toBe("2025-01-06");
  });

  it("allows null pillar snapshot for unassigned tasks", () => {
    const task = makeTaskForCompletion({
      pillarId: null,
      focusTrack: null,
    });
    const payload = buildCompletionEventPayload(
      task,
      TEST_TZ,
      MONDAY_8PM_NY,
      { pillarName: null, pillarColor: null },
      "ce-null",
      MONDAY_8PM_NY.toISOString(),
    );
    expect(payload.pillarId).toBeNull();
    expect(payload.pillarName).toBeNull();
    expect(payload.pillarColor).toBeNull();
  });
});

describe("resolvePillarSnapshotForCompletion", () => {
  it("returns pillar name and color from strategy pillars", () => {
    const task = makeTaskForCompletion({ pillarId: "p-work" });
    expect(resolvePillarSnapshotForCompletion(task, testPillars)).toEqual({
      pillarName: "工作",
      pillarColor: "#3b82f6",
    });
  });

  it("returns null snapshot when task has no pillar", () => {
    expect(
      resolvePillarSnapshotForCompletion(
        makeTaskForCompletion({ pillarId: null }),
        testPillars,
      ),
    ).toEqual({ pillarName: null, pillarColor: null });
  });

  it("returns null snapshot when pillar id is unknown", () => {
    expect(
      resolvePillarSnapshotForCompletion(
        makeTaskForCompletion({ pillarId: "missing" }),
        testPillars,
      ),
    ).toEqual({ pillarName: null, pillarColor: null });
  });
});

describe("filterCompletionEvents", () => {
  const events = [
    makeCompletionEvent({
      id: "e1",
      occurrenceDate: "2025-01-06",
      pillarId: "p-work",
    }),
    makeCompletionEvent({
      id: "e2",
      occurrenceDate: "2025-01-07",
      pillarId: "p-health",
      taskTitle: "Run",
    }),
    makeCompletionEvent({
      id: "e3",
      occurrenceDate: "2025-01-08",
      pillarId: "p-work",
      taskTitle: "LC 2",
    }),
  ];

  it("filters inclusive occurrence_date range", () => {
    const result = filterCompletionEvents(events, {
      since: "2025-01-06",
      until: "2025-01-07",
    });
    expect(result.map((e) => e.id)).toEqual(["e2", "e1"]);
  });

  it("filters by pillarId when provided", () => {
    const result = filterCompletionEvents(events, {
      since: "2025-01-06",
      until: "2025-01-08",
      pillarId: "p-work",
    });
    expect(result.map((e) => e.id)).toEqual(["e3", "e1"]);
  });

  it("respects limit", () => {
    const result = filterCompletionEvents(events, {
      since: "2025-01-06",
      until: "2025-01-08",
      limit: 2,
    });
    expect(result).toHaveLength(2);
  });

  it("returns empty when range excludes all events", () => {
    expect(
      filterCompletionEvents(events, {
        since: "2025-02-01",
        until: "2025-02-02",
      }),
    ).toEqual([]);
  });

  it("sorts by occurrence_date desc then completed_at desc", () => {
    const result = filterCompletionEvents(
      [
        makeCompletionEvent({
          id: "old-day",
          occurrenceDate: "2025-01-06",
          completedAt: "2025-01-06T10:00:00.000Z",
        }),
        makeCompletionEvent({
          id: "new-day",
          occurrenceDate: "2025-01-08",
          completedAt: "2025-01-08T10:00:00.000Z",
        }),
        makeCompletionEvent({
          id: "same-day-later",
          occurrenceDate: "2025-01-08",
          completedAt: "2025-01-08T20:00:00.000Z",
        }),
      ],
      { since: "2025-01-06", until: "2025-01-08" },
    );
    expect(result.map((e) => e.id)).toEqual([
      "same-day-later",
      "new-day",
      "old-day",
    ]);
  });

  it("limit keeps newest events after sorting", () => {
    const result = filterCompletionEvents(
      [
        makeCompletionEvent({
          id: "e1",
          occurrenceDate: "2025-01-06",
          completedAt: "2025-01-06T10:00:00.000Z",
        }),
        makeCompletionEvent({
          id: "e2",
          occurrenceDate: "2025-01-08",
          completedAt: "2025-01-08T10:00:00.000Z",
        }),
      ],
      { since: "2025-01-06", until: "2025-01-08", limit: 1 },
    );
    expect(result.map((e) => e.id)).toEqual(["e2"]);
  });
});

describe("summarizeCompletionEventsByPillar", () => {
  it("counts events and returns top titles per pillar", () => {
    const events = [
      makeCompletionEvent({ id: "1", pillarId: "p-work", taskTitle: "A" }),
      makeCompletionEvent({ id: "2", pillarId: "p-work", taskTitle: "B" }),
      makeCompletionEvent({
        id: "3",
        pillarId: "p-health",
        taskTitle: "Run",
      }),
      makeCompletionEvent({
        id: "4",
        pillarId: null,
        taskTitle: "Misc",
        pillarName: null,
      }),
    ];
    const summary = summarizeCompletionEventsByPillar(events, 2);
    expect(summary).toEqual(
      expect.arrayContaining([
        { pillarId: "p-work", count: 2, topTitles: ["A", "B"] },
        { pillarId: "p-health", count: 1, topTitles: ["Run"] },
        { pillarId: null, count: 1, topTitles: ["Misc"] },
      ]),
    );
  });

  it("truncates topTitles to topN", () => {
    const events = [
      makeCompletionEvent({ id: "1", pillarId: "p-work", taskTitle: "A" }),
      makeCompletionEvent({ id: "2", pillarId: "p-work", taskTitle: "B" }),
      makeCompletionEvent({ id: "3", pillarId: "p-work", taskTitle: "C" }),
      makeCompletionEvent({ id: "4", pillarId: "p-work", taskTitle: "D" }),
    ];
    const summary = summarizeCompletionEventsByPillar(events, 2);
    const work = summary.find((row) => row.pillarId === "p-work");
    expect(work?.count).toBe(4);
    expect(work?.topTitles).toHaveLength(2);
  });

  it("orders pillars by count descending", () => {
    const summary = summarizeCompletionEventsByPillar([
      makeCompletionEvent({ id: "1", pillarId: "p-health", taskTitle: "Run" }),
      makeCompletionEvent({ id: "2", pillarId: "p-work", taskTitle: "A" }),
      makeCompletionEvent({ id: "3", pillarId: "p-work", taskTitle: "B" }),
    ]);
    expect(summary.map((row) => row.pillarId)).toEqual(["p-work", "p-health"]);
  });
});

describe("groupCompletionEventsByDate", () => {
  it("groups by occurrence_date descending", () => {
    const groups = groupCompletionEventsByDate([
      makeCompletionEvent({ id: "a", occurrenceDate: "2025-01-06" }),
      makeCompletionEvent({ id: "b", occurrenceDate: "2025-01-08" }),
      makeCompletionEvent({ id: "c", occurrenceDate: "2025-01-08" }),
    ]);
    expect(groups.map((g) => g.date)).toEqual(["2025-01-08", "2025-01-06"]);
    expect(groups[0]!.events.map((e) => e.id)).toEqual(["b", "c"]);
  });

  it("sorts events within a date by completed_at descending", () => {
    const groups = groupCompletionEventsByDate([
      makeCompletionEvent({
        id: "early",
        occurrenceDate: "2025-01-08",
        completedAt: "2025-01-08T10:00:00.000Z",
      }),
      makeCompletionEvent({
        id: "late",
        occurrenceDate: "2025-01-08",
        completedAt: "2025-01-08T20:00:00.000Z",
      }),
    ]);
    expect(groups[0]!.events.map((e) => e.id)).toEqual(["late", "early"]);
  });
});

describe("Plan §6 completion log scenarios (pure simulation)", () => {
  function simulateEvents(
    transitions: Array<{ from: string; to: string; eventId?: string }>,
  ) {
    let status = "todo";
    const events: ReturnType<typeof makeCompletionEvent>[] = [];
    for (const step of transitions) {
      if (shouldRecordCompletionTransition(status, step.to) && step.eventId) {
        events.push(makeCompletionEvent({ id: step.eventId }));
      }
      status = step.to;
    }
    return { events, status };
  }

  it("first done writes one event; repeat PATCH done does not", () => {
    const first = simulateEvents([
      { from: "todo", to: "done", eventId: "e1" },
      { from: "done", to: "done" },
    ]);
    expect(first.events).toHaveLength(1);

    const second = simulateEvents([
      { from: "todo", to: "done", eventId: "e1" },
      { from: "done", to: "done" },
      { from: "done", to: "done" },
    ]);
    expect(second.events).toHaveLength(1);
  });

  it("reopen then recomplete produces two events; reopen does not delete", () => {
    const result = simulateEvents([
      { from: "todo", to: "done", eventId: "e1" },
      { from: "done", to: "todo" },
      { from: "todo", to: "done", eventId: "e2" },
    ]);
    expect(result.events.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(result.status).toBe("done");
  });

  it("openOccurrence reset transition done→todo does not write event", () => {
    const result = simulateEvents([
      { from: "todo", to: "done", eventId: "e1" },
      { from: "done", to: "todo" },
    ]);
    expect(result.events).toHaveLength(1);
  });

  it("recurring Mon done → Wed reset: event persists; done tab empty", () => {
    const events = [
      makeCompletionEvent({
        id: "e-mon",
        taskId: "weekly-1",
        occurrenceDate: "2025-01-06",
        completedAt: MONDAY_8PM_NY.toISOString(),
        recurrenceType: "weekly",
      }),
    ];
    const tasksAfterReset = [
      makeTask({
        id: "weekly-1",
        status: "todo",
        completedAt: null,
        recurrenceType: "weekly",
        recurrenceDays: weeklyMonWed().recurrenceDays,
      }),
    ];
    expect(filterTasksByStatus(tasksAfterReset, "done")).toEqual([]);
    expect(
      filterCompletionEvents(events, {
        since: "2025-01-06",
        until: "2025-01-08",
      }).map((e) => e.id),
    ).toEqual(["e-mon"]);
  });
});
