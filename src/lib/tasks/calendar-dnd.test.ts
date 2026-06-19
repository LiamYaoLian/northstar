import { describe, expect, it } from "vitest";
import {
  UNSCHEDULED_DROPPABLE_ID,
  dayDroppableId,
  occurrenceDraggableId,
  parseDayDroppableId,
  parseDraggableTaskId,
  resolveDragDrop,
  unscheduledDraggableId,
} from "./calendar-dnd";
import { slotDroppableId } from "./calendar-time-grid";
import { makeTask } from "@/lib/test-fixtures";

describe("calendar dnd ids", () => {
  it("builds occurrence and unscheduled draggable ids", () => {
    expect(occurrenceDraggableId("t1", "2025-01-06", "09:15")).toBe(
      "occurrence:t1:2025-01-06T09:15",
    );
    expect(occurrenceDraggableId("t1", "2025-01-06")).toBe(
      "occurrence:t1:2025-01-06",
    );
    expect(unscheduledDraggableId("t1")).toBe("unscheduled:t1");
    expect(dayDroppableId("2025-01-06")).toBe("day:2025-01-06");
    expect(slotDroppableId("2025-01-06", "09:15")).toBe("slot:2025-01-06T09:15");
  });

  it("parses draggable and droppable ids", () => {
    expect(parseDraggableTaskId("unscheduled:t1")).toBe("t1");
    expect(parseDraggableTaskId("occurrence:t1:2025-01-06T09:15")).toBe("t1");
    expect(parseDraggableTaskId("occurrence:t1:2025-01-06")).toBe("t1");
    expect(parseDayDroppableId("day:2025-01-06")).toBe("2025-01-06");
  });
});

describe("resolveDragDrop", () => {
  const oneOff = makeTask({ id: "t1", recurrenceType: "none" });
  const recurring = makeTask({ id: "t2", recurrenceType: "weekly" });

  it("schedules an unscheduled one-off onto a time slot", () => {
    expect(
      resolveDragDrop(
        unscheduledDraggableId("t1"),
        slotDroppableId("2025-01-08", "09:30"),
        oneOff,
      ),
    ).toEqual({ taskId: "t1", nextStartAt: "2025-01-08T09:30" });
  });

  it("moves a scheduled one-off between time slots", () => {
    expect(
      resolveDragDrop(
        occurrenceDraggableId("t1", "2025-01-06", "09:00"),
        slotDroppableId("2025-01-06", "10:15"),
        oneOff,
      ),
    ).toEqual({ taskId: "t1", nextStartAt: "2025-01-06T10:15" });
  });

  it("still supports month-view day drops as date-only", () => {
    expect(
      resolveDragDrop(
        unscheduledDraggableId("t1"),
        dayDroppableId("2025-01-08"),
        oneOff,
      ),
    ).toEqual({ taskId: "t1", nextStartAt: "2025-01-08" });
  });

  it("clears startAt when dropping one-off onto unscheduled", () => {
    expect(
      resolveDragDrop(
        occurrenceDraggableId("t1", "2025-01-06", "09:00"),
        UNSCHEDULED_DROPPABLE_ID,
        oneOff,
      ),
    ).toEqual({ taskId: "t1", nextStartAt: null });
  });

  it("rejects recurring drop onto unscheduled", () => {
    expect(
      resolveDragDrop(
        occurrenceDraggableId("t2", "2025-01-06", "09:00"),
        UNSCHEDULED_DROPPABLE_ID,
        recurring,
      ),
    ).toBeNull();
  });

  it("returns null when dropped on the same slot", () => {
    expect(
      resolveDragDrop(
        occurrenceDraggableId("t1", "2025-01-06", "09:00"),
        slotDroppableId("2025-01-06", "09:00"),
        oneOff,
      ),
    ).toBeNull();
  });

  it("returns null for invalid over target", () => {
    expect(
      resolveDragDrop(unscheduledDraggableId("t1"), "invalid", oneOff),
    ).toBeNull();
  });
});
