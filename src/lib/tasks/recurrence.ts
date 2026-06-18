import type { RecurrenceTaskFields } from "./recurrence-types";
import { parseRecurrenceDays } from "./recurrence-types";
import {
  addLocalDays,
  endOfLocalDay,
  isoWeekdayInTz,
  startOfLocalDay,
} from "./timezone";

function weekdayMatches(task: RecurrenceTaskFields, instant: Date, tz: string): boolean {
  if (task.recurrenceType === "daily") return true;
  if (task.recurrenceType !== "weekly") return false;
  const days = parseRecurrenceDays(task.recurrenceDays);
  if (!days) return false;
  return days.includes(isoWeekdayInTz(instant, tz));
}

export function matchesRecurrenceDay(
  task: RecurrenceTaskFields,
  instant: Date,
  tz: string,
): boolean {
  if (task.recurrenceType === "none") return false;
  return weekdayMatches(task, instant, tz);
}

export function lastScheduledOnOrBefore(
  task: RecurrenceTaskFields,
  instant: Date,
  tz: string,
): Date | null {
  if (task.recurrenceType === "none") return null;

  let cursor = startOfLocalDay(instant, tz);
  for (let i = 0; i < 366; i++) {
    if (weekdayMatches(task, cursor, tz)) {
      return startOfLocalDay(cursor, tz);
    }
    cursor = addLocalDays(cursor, tz, -1);
  }
  return null;
}

export function nextScheduledAfter(
  task: RecurrenceTaskFields,
  instant: Date,
  tz: string,
): Date | null {
  if (task.recurrenceType === "none") return null;

  let cursor = startOfLocalDay(instant, tz);
  if (task.status === "done" && isCompletedForToday(task, instant, tz)) {
    cursor = addLocalDays(cursor, tz, 1);
  }

  for (let i = 0; i < 366; i++) {
    if (matchesRecurrenceDay(task, cursor, tz)) {
      return startOfLocalDay(cursor, tz);
    }
    cursor = addLocalDays(cursor, tz, 1);
  }
  return null;
}

export function isCompletedForToday(
  task: RecurrenceTaskFields,
  instant: Date,
  tz: string,
): boolean {
  if (task.status !== "done" || task.completedAt == null) return false;
  return Date.parse(task.completedAt) >= startOfLocalDay(instant, tz).getTime();
}

export function isOccurrenceOverdue(
  task: RecurrenceTaskFields,
  instant: Date,
  tz: string,
): boolean {
  if (task.status === "done") return false;
  const last = lastScheduledOnOrBefore(task, instant, tz);
  if (!last) return false;
  if (
    task.completedAt &&
    Date.parse(task.completedAt) >= last.getTime()
  ) {
    return false;
  }
  return instant.getTime() >= last.getTime();
}

export function needsOccurrenceReset(
  task: RecurrenceTaskFields,
  instant: Date,
  tz: string,
): boolean {
  if (task.recurrenceType === "none" || task.status !== "done") return false;
  if (!matchesRecurrenceDay(task, instant, tz)) return false;
  if (isCompletedForToday(task, instant, tz)) return false;
  if (
    task.completedAt != null &&
    Date.parse(task.completedAt) < startOfLocalDay(instant, tz).getTime()
  ) {
    return true;
  }
  return false;
}

export function shouldShowOnToday(
  task: RecurrenceTaskFields,
  instant: Date,
  tz: string,
): boolean {
  if (task.recurrenceType === "none") {
    return task.status !== "done";
  }
  if (isCompletedForToday(task, instant, tz)) return false;
  if (matchesRecurrenceDay(task, instant, tz)) return true;
  if (
    task.recurrenceType === "weekly" &&
    task.recurrenceCarryOver &&
    task.status !== "done" &&
    isOccurrenceOverdue(task, instant, tz)
  ) {
    return true;
  }
  return false;
}

export function virtualDeadlineForPriority(
  task: RecurrenceTaskFields,
  instant: Date,
  tz: string,
): Date | null {
  if (task.recurrenceType === "none" || task.status === "done") return null;
  if (!shouldShowOnToday(task, instant, tz)) return null;
  return endOfLocalDay(instant, tz);
}
