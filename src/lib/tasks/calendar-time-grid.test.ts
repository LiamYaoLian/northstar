import { describe, expect, it } from "vitest";
import {
  buildDayTaskPlacements,
  buildDayTimeSlots,
  buildWeekTaskSlotMap,
  CALENDAR_SLOT_HEIGHT_PX,
  CALENDAR_SLOTS_PER_DAY,
  DAY_TIME_SLOTS,
  getTaskSlotTime,
  parseSlotDroppableId,
  slotDroppableId,
  slotIndexForTimeStr,
  slotTimeFromDropPosition,
  snapTimeStr,
  startAtForCalendarSlot,
  taskBlockHeightPx,
  tasksForSlot,
} from "./calendar-time-grid";
import { localDateTimeInputToIso } from "./timezone";
import { makeTask } from "@/lib/test-fixtures";
import { TEST_TZ, dailyTask } from "./recurrence-test-helpers";

describe("calendar-time-grid", () => {
  it("builds 96 fifteen-minute slots per day", () => {
    const slots = buildDayTimeSlots();
    expect(slots).toHaveLength(CALENDAR_SLOTS_PER_DAY);
    expect(slots[0]?.timeStr).toBe("00:00");
    expect(slots[1]?.timeStr).toBe("00:15");
    expect(slots[3]?.timeStr).toBe("00:45");
    expect(slots[4]?.showHourLabel).toBe(true);
    expect(slots[4]?.timeStr).toBe("01:00");
    expect(slots.at(-1)?.timeStr).toBe("23:45");
  });

  it("snaps times to 15-minute boundaries", () => {
    expect(snapTimeStr("09:07")).toBe("09:00");
    expect(snapTimeStr("09:22")).toBe("09:15");
  });

  it("builds slot droppable ids", () => {
    expect(slotDroppableId("2025-01-06", "09:07")).toBe("slot:2025-01-06T09:00");
    expect(parseSlotDroppableId("slot:2025-01-06T09:15")).toEqual({
      dateStr: "2025-01-06",
      timeStr: "09:15",
    });
    expect(startAtForCalendarSlot("2025-01-06", "09:30")).toBe("2025-01-06T09:30");
  });

  it("places one-off tasks in the matching time slot", () => {
    const task = makeTask({
      recurrenceType: "none",
      startAt: localDateTimeInputToIso("2025-01-06T09:20", TEST_TZ),
      status: "todo",
    });
    expect(getTaskSlotTime(task, "2025-01-06", TEST_TZ)).toBe("09:15");
    expect(getTaskSlotTime(task, "2025-01-07", TEST_TZ)).toBeNull();
  });

  it("defaults recurring tasks without startAt to 09:00", () => {
    const task = makeTask({
      ...dailyTask(),
      startAt: null,
      status: "todo",
    });
    expect(getTaskSlotTime(task, "2025-01-06", TEST_TZ)).toBe("09:00");
  });

  it("groups tasks by slot", () => {
    const task = makeTask({
      id: "t1",
      recurrenceType: "none",
      startAt: localDateTimeInputToIso("2025-01-06T10:00", TEST_TZ),
      status: "todo",
    });
    const other = makeTask({
      id: "t2",
      recurrenceType: "none",
      startAt: localDateTimeInputToIso("2025-01-06T10:10", TEST_TZ),
      status: "todo",
    });
    expect(tasksForSlot([task, other], "2025-01-06", "10:00", TEST_TZ)).toHaveLength(
      2,
    );
    expect(tasksForSlot([task, other], "2025-01-06", "09:45", TEST_TZ)).toHaveLength(
      0,
    );
  });

  it("maps week tasks once per slot key", () => {
    const task = makeTask({
      id: "t1",
      recurrenceType: "none",
      startAt: localDateTimeInputToIso("2025-01-06T10:00", TEST_TZ),
      status: "todo",
    });
    const map = buildWeekTaskSlotMap(
      [task],
      [{ dateStr: "2025-01-06" }, { dateStr: "2025-01-07" }],
      TEST_TZ,
    );
    expect(map.get("2025-01-06:10:00")).toHaveLength(1);
    expect(map.get("2025-01-07:10:00")).toBeUndefined();
  });

  it("resolves drop position to a 15-minute slot", () => {
    const columnTop = 100;
    const columnHeight = DAY_TIME_SLOTS.length * CALENDAR_SLOT_HEIGHT_PX;
    expect(
      slotTimeFromDropPosition(columnTop + CALENDAR_SLOT_HEIGHT_PX * 4, columnTop, columnHeight),
    ).toBe("01:00");
  });

  it("scales block height with estimated minutes", () => {
    expect(taskBlockHeightPx(60)).toBe(CALENDAR_SLOT_HEIGHT_PX * 4);
    expect(taskBlockHeightPx(20)).toBe((20 / 15) * CALENDAR_SLOT_HEIGHT_PX);
    expect(taskBlockHeightPx(null)).toBe(CALENDAR_SLOT_HEIGHT_PX);
  });

  it("keeps short tasks clickable without inflating visual duration", () => {
    const task = makeTask({
      id: "t1",
      recurrenceType: "none",
      estimatedMin: 5,
      startAt: localDateTimeInputToIso("2025-01-06T10:00", TEST_TZ),
      status: "todo",
    });
    const [placement] = buildDayTaskPlacements([task], "2025-01-06", TEST_TZ);
    expect(placement?.durationHeightPx).toBe((5 / 15) * CALENDAR_SLOT_HEIGHT_PX);
    expect(placement?.heightPx).toBeGreaterThan(placement!.durationHeightPx);
  });

  it("builds placements with proportional height", () => {
    const task = makeTask({
      id: "t1",
      recurrenceType: "none",
      estimatedMin: 45,
      startAt: localDateTimeInputToIso("2025-01-06T10:00", TEST_TZ),
      status: "todo",
    });
    const [placement] = buildDayTaskPlacements([task], "2025-01-06", TEST_TZ);
    expect(placement?.durationHeightPx).toBe(CALENDAR_SLOT_HEIGHT_PX * 3);
    expect(placement?.heightPx).toBe(CALENDAR_SLOT_HEIGHT_PX * 3);
    expect(placement?.topPx).toBe(slotIndexForTimeStr("10:00") * CALENDAR_SLOT_HEIGHT_PX);
  });

  it("clamps block height to end of day", () => {
    const task = makeTask({
      id: "t1",
      recurrenceType: "none",
      estimatedMin: 240,
      startAt: localDateTimeInputToIso("2025-01-06T23:00", TEST_TZ),
      status: "todo",
    });
    const [placement] = buildDayTaskPlacements([task], "2025-01-06", TEST_TZ);
    expect(placement?.topPx).toBe(slotIndexForTimeStr("23:00") * CALENDAR_SLOT_HEIGHT_PX);
    expect(placement?.topPx + placement!.heightPx).toBeLessThanOrEqual(
      DAY_TIME_SLOTS.length * CALENDAR_SLOT_HEIGHT_PX,
    );
  });

  it("lays out overlapping tasks side by side", () => {
    const first = makeTask({
      id: "t1",
      recurrenceType: "none",
      estimatedMin: 60,
      startAt: localDateTimeInputToIso("2025-01-06T10:00", TEST_TZ),
      status: "todo",
    });
    const second = makeTask({
      id: "t2",
      recurrenceType: "none",
      estimatedMin: 45,
      startAt: localDateTimeInputToIso("2025-01-06T10:00", TEST_TZ),
      status: "todo",
    });
    const third = makeTask({
      id: "t3",
      recurrenceType: "none",
      estimatedMin: 30,
      startAt: localDateTimeInputToIso("2025-01-06T10:30", TEST_TZ),
      status: "todo",
    });

    const sameSlot = buildDayTaskPlacements([first, second], "2025-01-06", TEST_TZ);
    expect(sameSlot).toHaveLength(2);
    expect(sameSlot.every((item) => item.columnCount === 2)).toBe(true);
    expect(new Set(sameSlot.map((item) => item.columnIndex))).toEqual(new Set([0, 1]));

    const staggered = buildDayTaskPlacements([first, third], "2025-01-06", TEST_TZ);
    expect(staggered).toHaveLength(2);
    expect(staggered.every((item) => item.columnCount === 2)).toBe(true);
    expect(new Set(staggered.map((item) => item.columnIndex))).toEqual(new Set([0, 1]));
  });

  it("keeps non-overlapping tasks full width", () => {
    const first = makeTask({
      id: "t1",
      recurrenceType: "none",
      estimatedMin: 30,
      startAt: localDateTimeInputToIso("2025-01-06T10:00", TEST_TZ),
      status: "todo",
    });
    const second = makeTask({
      id: "t2",
      recurrenceType: "none",
      estimatedMin: 30,
      startAt: localDateTimeInputToIso("2025-01-06T11:00", TEST_TZ),
      status: "todo",
    });

    const placements = buildDayTaskPlacements([first, second], "2025-01-06", TEST_TZ);
    expect(placements.every((item) => item.columnCount === 1)).toBe(true);
    expect(placements.every((item) => item.columnIndex === 0)).toBe(true);
  });
});
