import type { RecurrenceType } from "@/lib/tasks/recurrence-types";
import {
  parseQuarterlyRecurrence,
  serializeQuarterlyRecurrence,
} from "@/lib/tasks/recurrence-types";

export type RecurrenceInference = {
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
  recurrenceCarryOver: boolean;
  source: "openai" | "rules";
};

const NONE: RecurrenceInference = {
  recurrenceType: "none",
  recurrenceDays: [],
  recurrenceCarryOver: false,
  source: "rules",
};

const WEEKDAY_MAP: Record<string, number> = {
  mon: 1,
  monday: 1,
  周一: 1,
  星期一: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  周二: 2,
  星期二: 2,
  wed: 3,
  wednesday: 3,
  周三: 3,
  星期三: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  周四: 4,
  星期四: 4,
  fri: 5,
  friday: 5,
  周五: 5,
  星期五: 5,
  sat: 6,
  saturday: 6,
  周六: 6,
  星期六: 6,
  周日: 7,
  周天: 7,
  星期日: 7,
  星期天: 7,
  sun: 7,
  sunday: 7,
};

function parseWeekdayTokens(title: string): number[] {
  const days = new Set<number>();
  const lower = title.toLowerCase();

  for (const [token, day] of Object.entries(WEEKDAY_MAP)) {
    if (lower.includes(token.toLowerCase())) days.add(day);
  }

  const numericMatch = title.match(/周([一二三四五六日天])/g);
  if (numericMatch) {
    const cnMap: Record<string, number> = {
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      日: 7,
      天: 7,
    };
    for (const match of numericMatch) {
      const char = match.slice(1);
      const day = cnMap[char];
      if (day) days.add(day);
    }
  }

  return [...days].sort((a, b) => a - b);
}

function hasCarryOverHint(title: string): boolean {
  return /补做|顺延|carry\s*over|catch\s*up/i.test(title);
}

export function normalizeRecurrenceInference(input: {
  recurrenceType: RecurrenceType;
  recurrenceDays?: number[] | null;
  recurrenceCarryOver?: boolean;
  source: "openai" | "rules";
}): RecurrenceInference {
  const recurrenceType = input.recurrenceType;
  if (recurrenceType === "none") {
    return { ...NONE, source: input.source };
  }

  if (recurrenceType === "daily") {
    return {
      recurrenceType: "daily",
      recurrenceDays: [],
      recurrenceCarryOver: false,
      source: input.source,
    };
  }

  if (recurrenceType === "monthly") {
    const days = (input.recurrenceDays ?? []).filter(
      (d) => Number.isInteger(d) && d >= 1 && d <= 31,
    );
    if (days.length === 0) {
      return { ...NONE, source: input.source };
    }
    return {
      recurrenceType: "monthly",
      recurrenceDays: [...new Set(days)].sort((a, b) => a - b),
      recurrenceCarryOver: false,
      source: input.source,
    };
  }

  if (recurrenceType === "quarterly") {
    const parsed = parseQuarterlyRecurrence(input.recurrenceDays ?? []);
    if (!parsed) {
      return { ...NONE, source: input.source };
    }
    return {
      recurrenceType: "quarterly",
      recurrenceDays: serializeQuarterlyRecurrence(
        parsed.monthInQuarter,
        parsed.dayOfMonth,
      ),
      recurrenceCarryOver: false,
      source: input.source,
    };
  }

  const days = (input.recurrenceDays ?? []).filter(
    (d) => Number.isInteger(d) && d >= 1 && d <= 7,
  );
  if (days.length === 0) {
    return { ...NONE, source: input.source };
  }

  return {
    recurrenceType: "weekly",
    recurrenceDays: [...new Set(days)].sort((a, b) => a - b),
    recurrenceCarryOver: Boolean(input.recurrenceCarryOver),
    source: input.source,
  };
}

/** Conservative rule-based fallback when LLM is unavailable or fails. */
export function ruleBasedInferRecurrence(title: string): RecurrenceInference {
  const trimmed = title.trim();
  if (!trimmed) return NONE;

  if (/每天|每日|\bdaily\b|every\s+day/i.test(trimmed)) {
    return normalizeRecurrenceInference({
      recurrenceType: "daily",
      source: "rules",
    });
  }

  const quarterMonthMatch = trimmed.match(
    /每季度第\s*([123一二三])\s*个?\s*月|quarter\s*month\s*([123])/i,
  );
  if (/每季度|quarterly|every\s+quarter/i.test(trimmed)) {
    const cnMonth: Record<string, number> = { 一: 1, 二: 2, 三: 3 };
    const monthToken = quarterMonthMatch?.[1] ?? quarterMonthMatch?.[2];
    const monthInQuarter = monthToken
      ? cnMonth[monthToken] ?? Math.min(3, Math.max(1, Number(monthToken)))
      : 1;

    let day = 1;
    const dayWithHao = trimmed.match(/(\d{1,2})\s*号/);
    const dayWithRi = trimmed.match(/(\d{1,2})\s*日/);
    if (dayWithHao) {
      day = Math.min(31, Math.max(1, Number(dayWithHao[1])));
    } else if (dayWithRi) {
      day = Math.min(31, Math.max(1, Number(dayWithRi[1])));
    } else {
      const dayOnly = trimmed.match(
        /(?:quarterly|every\s+quarter)\s+(\d{1,2})\b/i,
      );
      if (dayOnly) {
        day = Math.min(31, Math.max(1, Number(dayOnly[1])));
      }
    }

    return normalizeRecurrenceInference({
      recurrenceType: "quarterly",
      recurrenceDays: [monthInQuarter, day],
      source: "rules",
    });
  }

  const monthlyDayMatch = trimmed.match(
    /(?:每月|monthly|every\s+month)[^\d]{0,8}(\d{1,2})\s*[号日]?/i,
  );
  if (/每月|monthly|every\s+month/i.test(trimmed)) {
    const day = monthlyDayMatch
      ? Math.min(31, Math.max(1, Number(monthlyDayMatch[1])))
      : 1;
    return normalizeRecurrenceInference({
      recurrenceType: "monthly",
      recurrenceDays: [day],
      source: "rules",
    });
  }

  const days = parseWeekdayTokens(trimmed);
  if (/每周|\bweekly\b|every\s+week/i.test(trimmed) || days.length > 0) {
    return normalizeRecurrenceInference({
      recurrenceType: "weekly",
      recurrenceDays: days.length > 0 ? days : [1, 2, 3, 4, 5],
      recurrenceCarryOver: hasCarryOverHint(trimmed),
      source: "rules",
    });
  }

  return NONE;
}
