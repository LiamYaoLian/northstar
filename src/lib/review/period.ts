import type { TimeEntry } from "@/lib/db/schema";
import {
  localDateString,
  startOfLocalMonth,
  startOfLocalWeek,
} from "@/lib/tasks/timezone";

export type ReviewPeriod = "week" | "month";
export type AlignmentPeriod = "today" | "week" | "month" | "all";

export type ReviewPeriodRange = {
  periodStart: string;
  periodEnd: string;
};

const ALL_TIME_RANGE: ReviewPeriodRange = {
  periodStart: "2000-01-01",
  periodEnd: "2099-12-31",
};

export function resolveReviewPeriod(
  period: ReviewPeriod,
  tz: string,
  now = new Date(),
): ReviewPeriodRange {
  if (period === "week") {
    return {
      periodStart: localDateString(startOfLocalWeek(now, tz), tz),
      periodEnd: localDateString(now, tz),
    };
  }
  return {
    periodStart: localDateString(startOfLocalMonth(now, tz), tz),
    periodEnd: localDateString(now, tz),
  };
}

export function resolveAlignmentPeriod(
  period: AlignmentPeriod,
  tz: string,
  now = new Date(),
): ReviewPeriodRange {
  if (period === "today") {
    const today = localDateString(now, tz);
    return { periodStart: today, periodEnd: today };
  }
  if (period === "all") {
    return ALL_TIME_RANGE;
  }
  if (period === "week") {
    return resolveReviewPeriod("week", tz, now);
  }
  return resolveReviewPeriod("month", tz, now);
}

export function parseAlignmentPeriod(value: string | null): AlignmentPeriod {
  if (value === "today" || value === "month" || value === "all") {
    return value;
  }
  return "week";
}

export function reviewPeriodFromAlignment(
  period: AlignmentPeriod,
): ReviewPeriod | null {
  if (period === "week" || period === "month") {
    return period;
  }
  return null;
}

export function filterTimeEntriesInDateRange(
  entries: TimeEntry[],
  since: string,
  until: string,
  tz: string,
): TimeEntry[] {
  return entries.filter((entry) => {
    const day = localDateString(new Date(entry.startedAt), tz);
    return day >= since && day <= until;
  });
}

export function isDateInRange(day: string, since: string, until: string): boolean {
  return day >= since && day <= until;
}
