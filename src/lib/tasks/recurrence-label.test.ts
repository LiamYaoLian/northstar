import { describe, expect, it } from "vitest";
import { formatRecurrenceFrequency } from "./recurrence-label";

const messages = {
  daily: "每天",
  weekly: "每周",
  monthly: "每月",
  weeklyOn: (days: string) => `每周 ${days}`,
  monthlyOn: (day: number) => `每月 ${day} 日`,
  carryOverShort: "补做",
  weekday: {
    1: "一",
    2: "二",
    3: "三",
    4: "四",
    5: "五",
    6: "六",
    7: "日",
  },
};

describe("formatRecurrenceFrequency", () => {
  it("returns null for one-off tasks", () => {
    expect(
      formatRecurrenceFrequency("none", null, false, messages),
    ).toBeNull();
  });

  it("formats daily recurrence", () => {
    expect(formatRecurrenceFrequency("daily", null, false, messages)).toBe("每天");
  });

  it("formats weekly recurrence with weekday labels", () => {
    expect(
      formatRecurrenceFrequency("weekly", JSON.stringify([1, 3]), false, messages),
    ).toBe("每周 一、三");
  });

  it("appends carry-over hint for weekly tasks", () => {
    expect(
      formatRecurrenceFrequency("weekly", JSON.stringify([5]), true, messages),
    ).toBe("每周 五 · 补做");
  });

  it("formats monthly recurrence with day of month", () => {
    expect(
      formatRecurrenceFrequency("monthly", JSON.stringify([15]), false, messages),
    ).toBe("每月 15 日");
  });
});
