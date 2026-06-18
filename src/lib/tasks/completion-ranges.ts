import { localDateString, startOfLocalWeek } from "./timezone";

export type CompletionDateRange = {
  since: string;
  until: string;
};

export function completionQueryForToday(tz: string, now: Date): CompletionDateRange {
  const today = localDateString(now, tz);
  return { since: today, until: today };
}

export function completionQueryForPageRange(
  range: "today" | "week" | "all",
  tz: string,
  now: Date,
): CompletionDateRange | null {
  if (range === "all") return null;
  if (range === "today") return completionQueryForToday(tz, now);
  return {
    since: localDateString(startOfLocalWeek(now, tz), tz),
    until: localDateString(now, tz),
  };
}

export function completionQueryForAlignmentWeek(
  tz: string,
  now: Date,
): CompletionDateRange {
  return completionQueryForPageRange("week", tz, now)!;
}
