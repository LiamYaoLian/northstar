import type { Task } from "@/lib/db/schema";
import { taskAppearsOnDay } from "./calendar";
import { normalizeTaskStartAt, taskStartAtToInputValue } from "./task-dates";
import { localDateString } from "./timezone";

export const CALENDAR_SLOT_MINUTES = 15;
export const CALENDAR_SLOT_HEIGHT_PX = 16;
export const CALENDAR_SLOTS_PER_DAY = (24 * 60) / CALENDAR_SLOT_MINUTES;

function buildDayTimeSlotsInternal(): CalendarTimeSlotRow[] {
  const slots: CalendarTimeSlotRow[] = [];
  for (let index = 0; index < CALENDAR_SLOTS_PER_DAY; index++) {
    const totalMinutes = index * CALENDAR_SLOT_MINUTES;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    slots.push({
      timeStr: formatTimeStr(hour, minute),
      slotIndex: index,
      showHourLabel: minute === 0,
    });
  }
  return slots;
}

export const DAY_TIME_SLOTS = buildDayTimeSlotsInternal();

export type CalendarTimeSlotRow = {
  timeStr: string;
  slotIndex: number;
  showHourLabel: boolean;
};

export function buildDayTimeSlots(): CalendarTimeSlotRow[] {
  return DAY_TIME_SLOTS;
}

export function formatTimeStr(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function snapMinuteToSlot(minute: number): number {
  return Math.floor(minute / CALENDAR_SLOT_MINUTES) * CALENDAR_SLOT_MINUTES;
}

export function snapTimeStr(timeStr: string): string {
  const [hourRaw, minuteRaw] = timeStr.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return "00:00";
  return formatTimeStr(hour, snapMinuteToSlot(minute));
}

export function slotDroppableId(dateStr: string, timeStr: string): string {
  return `slot:${dateStr}T${snapTimeStr(timeStr)}`;
}

export function parseSlotDroppableId(
  overId: string,
): { dateStr: string; timeStr: string } | null {
  if (!overId.startsWith("slot:")) return null;
  const rest = overId.slice("slot:".length);
  const match = rest.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
  if (!match) return null;
  return { dateStr: match[1], timeStr: match[2] };
}

export function startAtForCalendarSlot(dateStr: string, timeStr: string): string {
  return `${dateStr}T${snapTimeStr(timeStr)}`;
}

export function occurrenceSlotKey(dateStr: string, timeStr: string): string {
  return `${dateStr}T${snapTimeStr(timeStr)}`;
}

export type CalendarTaskFields = Pick<
  Task,
  "recurrenceType" | "startAt" | "status" | "estimatedMin" | "id" | "title"
> &
  Parameters<typeof taskAppearsOnDay>[0] & {
    pillarColor?: string | null;
  };

export type CalendarTaskPlacement = {
  task: CalendarTaskFields;
  timeStr: string;
  topPx: number;
  heightPx: number;
};

export function taskDurationMinutes(
  estimatedMin: number | null | undefined,
): number {
  if (estimatedMin != null && estimatedMin > 0) return estimatedMin;
  return CALENDAR_SLOT_MINUTES;
}

export function taskBlockHeightPx(
  estimatedMin: number | null | undefined,
): number {
  return (
    (taskDurationMinutes(estimatedMin) / CALENDAR_SLOT_MINUTES) *
    CALENDAR_SLOT_HEIGHT_PX
  );
}

export function slotIndexForTimeStr(timeStr: string): number {
  const snapped = snapTimeStr(timeStr);
  const [hourRaw, minuteRaw] = snapped.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return 0;
  return Math.floor((hour * 60 + minute) / CALENDAR_SLOT_MINUTES);
}

export function clampTaskBlockHeight(
  topPx: number,
  heightPx: number,
  columnHeightPx: number,
): number {
  return Math.max(CALENDAR_SLOT_HEIGHT_PX, Math.min(heightPx, columnHeightPx - topPx));
}

export function buildDayTaskPlacements(
  tasks: CalendarTaskFields[],
  dayDateStr: string,
  tz: string,
): CalendarTaskPlacement[] {
  const columnHeight = DAY_TIME_SLOTS.length * CALENDAR_SLOT_HEIGHT_PX;
  const placements: CalendarTaskPlacement[] = [];

  for (const task of tasks) {
    const timeStr = getTaskSlotTime(task, dayDateStr, tz);
    if (!timeStr) continue;

    const topPx = slotIndexForTimeStr(timeStr) * CALENDAR_SLOT_HEIGHT_PX;
    const heightPx = clampTaskBlockHeight(
      topPx,
      taskBlockHeightPx(task.estimatedMin),
      columnHeight,
    );

    placements.push({ task, timeStr, topPx, heightPx });
  }

  return placements;
}

export function buildWeekTaskPlacements(
  tasks: CalendarTaskFields[],
  days: DayLike[],
  tz: string,
): Map<string, CalendarTaskPlacement[]> {
  const map = new Map<string, CalendarTaskPlacement[]>();
  for (const day of days) {
    map.set(day.dateStr, buildDayTaskPlacements(tasks, day.dateStr, tz));
  }
  return map;
}

export function getTaskSlotTime(
  task: CalendarTaskFields,
  dayDateStr: string,
  tz: string,
): string | null {
  const parsed = normalizeTaskStartAt(dayDateStr, tz);
  if (!parsed) return null;
  const dayInstant = new Date(parsed);
  if (!taskAppearsOnDay(task, dayInstant, tz)) return null;

  const startIso = normalizeTaskStartAt(task.startAt, tz);
  if (startIso) {
    const localDate = localDateString(new Date(startIso), tz);
    if (task.recurrenceType === "none" && localDate !== dayDateStr) {
      return null;
    }
    const input = taskStartAtToInputValue(startIso, tz);
    if (input.length >= 16) {
      return snapTimeStr(input.slice(11, 16));
    }
  }

  return "09:00";
}

export function tasksForSlot(
  tasks: CalendarTaskFields[],
  dateStr: string,
  timeStr: string,
  tz: string,
): CalendarTaskFields[] {
  const snapped = snapTimeStr(timeStr);
  return tasks.filter(
    (task) => getTaskSlotTime(task, dateStr, tz) === snapped,
  );
}

type DayLike = { dateStr: string };

export function buildWeekTaskSlotMap(
  tasks: CalendarTaskFields[],
  days: DayLike[],
  tz: string,
): Map<string, CalendarTaskFields[]> {
  const map = new Map<string, CalendarTaskFields[]>();
  for (const day of days) {
    for (const placement of buildDayTaskPlacements(tasks, day.dateStr, tz)) {
      const key = `${day.dateStr}:${placement.timeStr}`;
      const list = map.get(key);
      if (list) {
        list.push(placement.task);
      } else {
        map.set(key, [placement.task]);
      }
    }
  }
  return map;
}

export function slotIndexFromRelativeY(
  relativeY: number,
  slotHeightPx = CALENDAR_SLOT_HEIGHT_PX,
): number {
  return Math.max(
    0,
    Math.min(
      CALENDAR_SLOTS_PER_DAY - 1,
      Math.floor(relativeY / slotHeightPx),
    ),
  );
}

export function timeStrFromSlotIndex(index: number): string {
  return DAY_TIME_SLOTS[index]?.timeStr ?? "00:00";
}

export function slotTimeFromDropPosition(
  pointerY: number,
  columnTop: number,
  columnHeight: number,
  slotHeightPx = CALENDAR_SLOT_HEIGHT_PX,
): string | null {
  const relativeY = pointerY - columnTop;
  if (relativeY < 0 || relativeY > columnHeight) return null;
  return timeStrFromSlotIndex(slotIndexFromRelativeY(relativeY, slotHeightPx));
}
