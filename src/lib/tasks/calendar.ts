import type { Task } from "@/lib/db/schema";
import { isOccurrenceOverdue, matchesRecurrenceDay } from "./recurrence";
import { toRecurrenceFields } from "./recurrence-types";
import { normalizeTaskStartAt } from "./task-dates";
import {
  addLocalDays,
  daysInLocalMonth,
  localDateString,
  resolveTimezone,
  startOfLocalMonth,
  startOfLocalWeek,
} from "./timezone";

export type CalendarView = "week" | "month";

export type CalendarDay = {
  date: Date;
  dateStr: string;
  inMonth: boolean;
};

export type CalendarUrlState = {
  view: CalendarView;
  anchor: Date;
  anchorDateStr: string;
};

type CalendarTaskFields = Pick<
  Task,
  "recurrenceType" | "startAt" | "status"
> &
  Parameters<typeof toRecurrenceFields>[0];

export function isUnscheduledTask(
  task: CalendarTaskFields,
  tz?: string,
): boolean {
  if (task.status === "done") return false;
  if (task.recurrenceType !== "none") return false;
  return normalizeTaskStartAt(task.startAt, tz) == null;
}

export function taskAppearsOnDay(
  task: CalendarTaskFields,
  dayInstant: Date,
  tz: string,
): boolean {
  if (task.recurrenceType === "none") {
    const startIso = normalizeTaskStartAt(task.startAt, tz);
    if (!startIso) return false;
    return localDateString(new Date(startIso), tz) === localDateString(dayInstant, tz);
  }

  const fields = toRecurrenceFields(task);
  if (matchesRecurrenceDay(fields, dayInstant, tz)) return true;

  if (
    task.recurrenceType === "weekly" &&
    task.recurrenceCarryOver &&
    task.status !== "done" &&
    isOccurrenceOverdue(fields, dayInstant, tz)
  ) {
    return true;
  }

  return false;
}

export function buildWeekDays(anchor: Date, tz: string): CalendarDay[] {
  const weekStart = startOfLocalWeek(anchor, tz);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addLocalDays(weekStart, tz, index);
    return {
      date,
      dateStr: localDateString(date, tz),
      inMonth: true,
    };
  });
}

export function buildMonthGrid(anchor: Date, tz: string): CalendarDay[][] {
  const monthStart = startOfLocalMonth(anchor, tz);
  const monthKey = localDateString(anchor, tz).slice(0, 7);
  let cursor = startOfLocalWeek(monthStart, tz);
  const rows: CalendarDay[][] = [];

  for (let row = 0; row < 6; row++) {
    const cells: CalendarDay[] = [];
    for (let col = 0; col < 7; col++) {
      cells.push({
        date: cursor,
        dateStr: localDateString(cursor, tz),
        inMonth: localDateString(cursor, tz).slice(0, 7) === monthKey,
      });
      cursor = addLocalDays(cursor, tz, 1);
    }
    rows.push(cells);
  }

  return rows;
}

export function startAtForCalendarDay(dateStr: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  return dateStr;
}

export function parseCalendarUrlState(
  searchParams: Pick<URLSearchParams, "get">,
  tz?: string,
  now = new Date(),
): CalendarUrlState {
  const resolvedTz = resolveTimezone(tz);
  const viewParam = searchParams.get("view");
  const view: CalendarView = viewParam === "month" ? "month" : "week";

  const dateParam = searchParams.get("date");
  let anchor = now;
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const parsed = normalizeTaskStartAt(dateParam, resolvedTz);
    if (parsed) anchor = new Date(parsed);
  }

  return {
    view,
    anchor,
    anchorDateStr: localDateString(anchor, resolvedTz),
  };
}

export function stepCalendarAnchor(
  anchor: Date,
  view: CalendarView,
  direction: "prev" | "next",
  tz: string,
): Date {
  const delta = direction === "next" ? 1 : -1;
  if (view === "week") {
    return addLocalDays(anchor, tz, delta * 7);
  }

  const monthStart = startOfLocalMonth(anchor, tz);
  const monthLength = daysInLocalMonth(anchor, tz);
  const nextMonthStart = addLocalDays(monthStart, tz, monthLength);
  if (delta > 0) {
    return nextMonthStart;
  }
  const prevMonthAnchor = addLocalDays(monthStart, tz, -1);
  return startOfLocalMonth(prevMonthAnchor, tz);
}
