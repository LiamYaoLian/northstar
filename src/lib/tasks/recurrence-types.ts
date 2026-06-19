export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "quarterly";

/** Which month within each calendar quarter (1 → Jan/Apr/Jul/Oct, etc.). */
export type QuarterMonthSlot = 1 | 2 | 3;

export const QUARTER_MONTHS: Record<QuarterMonthSlot, readonly number[]> = {
  1: [1, 4, 7, 10],
  2: [2, 5, 8, 11],
  3: [3, 6, 9, 12],
};

export type QuarterlyRecurrence = {
  monthInQuarter: QuarterMonthSlot;
  dayOfMonth: number;
};

export function quarterMonthsForSlot(slot: QuarterMonthSlot): readonly number[] {
  return QUARTER_MONTHS[slot];
}

export function isQuarterMonth(
  calendarMonth: number,
  slot: QuarterMonthSlot,
): boolean {
  return QUARTER_MONTHS[slot].includes(calendarMonth);
}

export function defaultQuarterMonthSlot(): QuarterMonthSlot {
  const month = new Date().getMonth() + 1;
  return (((month - 1) % 3) + 1) as QuarterMonthSlot;
}

/** Quarterly stores [monthInQuarter (1-3), dayOfMonth (1-31)]; legacy [day] → slot 1. */
export function parseQuarterlyRecurrence(
  days: number[] | null | undefined,
): QuarterlyRecurrence | null {
  if (!days?.length) return null;
  if (days.length >= 2) {
    if (days[0] >= 1 && days[0] <= 3) {
      const dayOfMonth = days[1];
      if (dayOfMonth >= 1 && dayOfMonth <= 31) {
        return {
          monthInQuarter: days[0] as QuarterMonthSlot,
          dayOfMonth,
        };
      }
    }
    return null;
  }
  if (days[0] >= 1 && days[0] <= 31) {
    return { monthInQuarter: 1, dayOfMonth: days[0] };
  }
  return null;
}

export function serializeQuarterlyRecurrence(
  monthInQuarter: QuarterMonthSlot,
  dayOfMonth: number,
): number[] {
  return [monthInQuarter, dayOfMonth];
}

export type RecurrenceTaskFields = {
  recurrenceType: RecurrenceType;
  recurrenceDays: string | null;
  recurrenceCarryOver: boolean;
  status: string;
  completedAt: string | null;
};

export function recurrenceTypeUsesDays(
  type: RecurrenceType,
): type is "weekly" | "monthly" | "quarterly" {
  return type === "weekly" || type === "monthly" || type === "quarterly";
}

export function serializeRecurrenceDays(
  recurrenceType: RecurrenceType,
  recurrenceDays: number[] | null | undefined,
): string | null {
  if (!recurrenceTypeUsesDays(recurrenceType)) return null;
  if (!recurrenceDays?.length) return null;
  return JSON.stringify(recurrenceDays);
}

export function parseRecurrenceDays(json: string | null): number[] | null {
  if (json === null) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!parsed.every((v) => typeof v === "number" && Number.isInteger(v))) {
      return null;
    }
    return parsed as number[];
  } catch {
    return null;
  }
}

export function toRecurrenceFields(task: {
  recurrenceType: RecurrenceType | string;
  recurrenceDays: string | null;
  recurrenceCarryOver: boolean | number;
  status: string;
  completedAt: string | null;
}): RecurrenceTaskFields {
  return {
    recurrenceType: task.recurrenceType as RecurrenceType,
    recurrenceDays: task.recurrenceDays,
    recurrenceCarryOver: Boolean(task.recurrenceCarryOver),
    status: task.status,
    completedAt: task.completedAt,
  };
}
