import type { Task } from "@/lib/db/schema";
import { taskAppearsOnDay } from "./calendar";
import { normalizeTaskStartAt, taskStartAtToInputValue } from "./task-dates";
import { localDateString } from "./timezone";

export const CALENDAR_SLOT_MINUTES = 15;
export const CALENDAR_SLOT_HEIGHT_PX = 16;
export const CALENDAR_TASK_MIN_HEIGHT_PX = 12;
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
  /** Touch/drag target height (>= durationHeightPx). */
  heightPx: number;
  /** Proportional height from estimatedMin on the time grid. */
  durationHeightPx: number;
  /** Side-by-side column within an overlap cluster (0-based). */
  columnIndex: number;
  /** Number of columns in the overlap cluster. */
  columnCount: number;
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
  return Math.max(
    CALENDAR_TASK_MIN_HEIGHT_PX,
    Math.min(heightPx, columnHeightPx - topPx),
  );
}

type TimedBlock = { topPx: number; heightPx: number };

export function timedBlocksOverlap(a: TimedBlock, b: TimedBlock): boolean {
  return a.topPx < b.topPx + b.heightPx && b.topPx < a.topPx + a.heightPx;
}

function placementKey(placement: CalendarTaskPlacement): string {
  return `${placement.task.id}:${placement.timeStr}`;
}

function mergeOverlapClusters(
  placements: CalendarTaskPlacement[],
): CalendarTaskPlacement[][] {
  const clusters: CalendarTaskPlacement[][] = [];

  for (const placement of placements) {
    const touching = clusters.filter((cluster) =>
      cluster.some((item) => timedBlocksOverlap(item, placement)),
    );
    if (touching.length === 0) {
      clusters.push([placement]);
      continue;
    }

    const merged = [placement];
    for (const cluster of touching) {
      merged.push(...cluster);
    }
    for (const cluster of touching) {
      const index = clusters.indexOf(cluster);
      if (index >= 0) clusters.splice(index, 1);
    }
    clusters.push(merged);
  }

  return clusters;
}

export function assignOverlapColumns(
  placements: CalendarTaskPlacement[],
): CalendarTaskPlacement[] {
  if (placements.length === 0) return placements;

  const next = placements.map((placement) => ({
    ...placement,
    columnIndex: 0,
    columnCount: 1,
  }));

  for (const cluster of mergeOverlapClusters(next)) {
    const sorted = [...cluster].sort((a, b) => {
      if (a.topPx !== b.topPx) return a.topPx - b.topPx;
      return b.heightPx - a.heightPx;
    });
    const columns: CalendarTaskPlacement[][] = [];

    for (const placement of sorted) {
      let columnIndex = 0;
      while (true) {
        const column = columns[columnIndex];
        if (!column) {
          columns[columnIndex] = [placement];
          break;
        }
        const overlapsColumn = column.some((item) =>
          timedBlocksOverlap(item, placement),
        );
        if (!overlapsColumn) {
          column.push(placement);
          break;
        }
        columnIndex += 1;
      }
    }

    const columnCount = columns.length;
    for (const [columnIndex, column] of columns.entries()) {
      for (const placement of column) {
        const target = next.find(
          (item) => placementKey(item) === placementKey(placement),
        );
        if (!target) continue;
        target.columnIndex = columnIndex;
        target.columnCount = columnCount;
      }
    }
  }

  return next;
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
    const durationHeightPx = taskBlockHeightPx(task.estimatedMin);
    const heightPx = clampTaskBlockHeight(topPx, durationHeightPx, columnHeight);

    placements.push({
      task,
      timeStr,
      topPx,
      heightPx,
      durationHeightPx,
      columnIndex: 0,
      columnCount: 1,
    });
  }

  return assignOverlapColumns(placements);
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
