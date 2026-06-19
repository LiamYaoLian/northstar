import { parseRecurrenceDays, parseQuarterlyRecurrence, type RecurrenceType } from "./recurrence-types";

export type RecurrenceLabelMessages = {
  daily: string;
  weekly: string;
  monthly: string;
  quarterly: string;
  weeklyOn: (days: string) => string;
  monthlyOn: (day: number) => string;
  quarterlyOn: (monthInQuarter: number, day: number) => string;
  carryOverShort: string;
  weekday: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string>;
};

export function formatRecurrenceFrequency(
  recurrenceType: RecurrenceType | string,
  recurrenceDays: string | null,
  recurrenceCarryOver: boolean,
  messages: RecurrenceLabelMessages,
  weekdaySeparator = "、",
): string | null {
  if (recurrenceType === "none") return null;

  let label: string;
  if (recurrenceType === "daily") {
    label = messages.daily;
  } else if (recurrenceType === "weekly") {
    const days =
      parseRecurrenceDays(recurrenceDays)?.filter((d) => d >= 1 && d <= 7) ?? [];
    if (days.length > 0) {
      const daysLabel = days
        .map((day) => messages.weekday[day as 1 | 2 | 3 | 4 | 5 | 6 | 7])
        .join(weekdaySeparator);
      label = messages.weeklyOn(daysLabel);
    } else {
      label = messages.weekly;
    }
  } else if (recurrenceType === "monthly") {
    const day = parseRecurrenceDays(recurrenceDays)?.find((d) => d >= 1 && d <= 31);
    label = day != null ? messages.monthlyOn(day) : messages.monthly;
  } else if (recurrenceType === "quarterly") {
    const config = parseQuarterlyRecurrence(parseRecurrenceDays(recurrenceDays));
    label =
      config != null
        ? messages.quarterlyOn(config.monthInQuarter, config.dayOfMonth)
        : messages.quarterly;
  } else {
    return null;
  }

  if (recurrenceType === "weekly" && recurrenceCarryOver) {
    label = `${label} · ${messages.carryOverShort}`;
  }

  return label;
}
