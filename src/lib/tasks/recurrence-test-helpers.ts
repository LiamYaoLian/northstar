import type { RecurrenceTaskFields, RecurrenceType } from "./recurrence-types";
import type { Task } from "@/lib/db/schema";
import { makeTask } from "@/lib/test-fixtures";

/** Plan §6: frozen tests use America/New_York */
export const TEST_TZ = "America/New_York";

/** 2025-01-06 is Monday; 2025-01-07 Tue; 2025-01-08 Wed (EST, UTC-5) */
export const MONDAY_10AM_NY = new Date("2025-01-06T15:00:00.000Z");
export const MONDAY_8PM_NY = new Date("2025-01-07T01:00:00.000Z");
export const TUESDAY_10AM_NY = new Date("2025-01-07T15:00:00.000Z");
export const WEDNESDAY_10AM_NY = new Date("2025-01-08T15:00:00.000Z");
export const THURSDAY_10AM_NY = new Date("2025-01-09T15:00:00.000Z");
/** 2025-01-15 Wed 10am NY */
export const FIFTEENTH_10AM_NY = new Date("2025-01-15T15:00:00.000Z");
/** 2025-02-15 Sat 10am NY */
export const FEB_FIFTEENTH_10AM_NY = new Date("2025-02-15T15:00:00.000Z");
/** 2025-02-28 Fri 10am NY */
export const FEB_LAST_10AM_NY = new Date("2025-02-28T15:00:00.000Z");

export const WEEKLY_MON_WED = JSON.stringify([1, 3]);
export const WEEKLY_MON_ONLY = JSON.stringify([1]);

export function makeRecurrenceTask(
  overrides: Partial<RecurrenceTaskFields> = {},
): RecurrenceTaskFields {
  return {
    recurrenceType: "none",
    recurrenceDays: null,
    recurrenceCarryOver: false,
    status: "todo",
    completedAt: null,
    ...overrides,
  };
}

export function dailyTask(
  overrides: Partial<RecurrenceTaskFields> = {},
): RecurrenceTaskFields {
  return makeRecurrenceTask({
    recurrenceType: "daily",
    recurrenceDays: null,
    recurrenceCarryOver: false,
    ...overrides,
  });
}

export function weeklyMonWed(
  overrides: Partial<RecurrenceTaskFields> = {},
): RecurrenceTaskFields {
  return makeRecurrenceTask({
    recurrenceType: "weekly",
    recurrenceDays: WEEKLY_MON_WED,
    recurrenceCarryOver: false,
    ...overrides,
  });
}

export function weeklyMonOnly(
  overrides: Partial<RecurrenceTaskFields> = {},
): RecurrenceTaskFields {
  return makeRecurrenceTask({
    recurrenceType: "weekly",
    recurrenceDays: WEEKLY_MON_ONLY,
    recurrenceCarryOver: false,
    ...overrides,
  });
}

export function monthlyOnDay(
  day: number,
  overrides: Partial<RecurrenceTaskFields> = {},
): RecurrenceTaskFields {
  return makeRecurrenceTask({
    recurrenceType: "monthly",
    recurrenceDays: JSON.stringify([day]),
    recurrenceCarryOver: false,
    ...overrides,
  });
}
export type RecurringTaskRow = Task & {
  recurrenceType?: RecurrenceType;
  recurrenceDays?: string | null;
  recurrenceCarryOver?: boolean;
};

export function makeRecurringTaskRow(
  overrides: Partial<RecurringTaskRow> = {},
): RecurringTaskRow {
  const base = makeTask(overrides as Partial<Task>);
  return {
    ...base,
    recurrenceType: "none",
    recurrenceDays: null,
    recurrenceCarryOver: false,
    ...overrides,
  };
}
