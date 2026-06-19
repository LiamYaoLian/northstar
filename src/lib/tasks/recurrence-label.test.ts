import { describe, expect, it } from "vitest";
import { formatRecurrenceFrequency } from "./recurrence-label";

const messages = {
  daily: "每天",
  weekly: "每周",
  monthly: "每月",
  quarterly: "每季度",
  yearly: "每年",
  weeklyOn: (days: string) => `每周 ${days}`,
  monthlyOn: (day: number) => `每月 ${day} 日`,
  quarterlyOn: (monthInQuarter: number, day: number) =>
    `每季度第 ${monthInQuarter} 月 ${day} 日`,
  yearlyOn: (month: number, day: number) => `每年 ${month} 月 ${day} 日`,
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

  it("formats quarterly recurrence with month slot and day", () => {
    expect(
      formatRecurrenceFrequency("quarterly", JSON.stringify([2, 1]), false, messages),
    ).toBe("每季度第 2 月 1 日");
  });

  it("formats yearly recurrence with month and day", () => {
    expect(
      formatRecurrenceFrequency("yearly", JSON.stringify([3, 15]), false, messages),
    ).toBe("每年 3 月 15 日");
  });
});
