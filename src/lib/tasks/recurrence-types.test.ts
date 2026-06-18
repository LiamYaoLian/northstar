import { describe, it, expect } from "vitest";
import {
  parseRecurrenceDays,
  toRecurrenceFields,
} from "./recurrence-types";
import { WEEKLY_MON_WED } from "./recurrence-test-helpers";

describe("parseRecurrenceDays", () => {
  it("parses valid ISO weekday JSON array", () => {
    expect(parseRecurrenceDays(WEEKLY_MON_WED)).toEqual([1, 3]);
    expect(parseRecurrenceDays("[1,2,3,4,5,6,7]")).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("returns null for null input", () => {
    expect(parseRecurrenceDays(null)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseRecurrenceDays("not-json")).toBeNull();
    expect(parseRecurrenceDays("[1,3")).toBeNull();
  });

  it("returns null for non-number array elements", () => {
    expect(parseRecurrenceDays('["Mon","Wed"]')).toBeNull();
  });
});

describe("toRecurrenceFields", () => {
  it("passes through recurrence fields", () => {
    const input = {
      recurrenceType: "weekly" as const,
      recurrenceDays: WEEKLY_MON_WED,
      recurrenceCarryOver: true,
      status: "todo",
      completedAt: null,
    };
    expect(toRecurrenceFields(input)).toEqual(input);
  });

  it("coerces recurrenceCarryOver from integer-like values", () => {
    expect(
      toRecurrenceFields({
        recurrenceType: "weekly",
        recurrenceDays: WEEKLY_MON_WED,
        recurrenceCarryOver: 1 as unknown as boolean,
        status: "todo",
        completedAt: null,
      }).recurrenceCarryOver,
    ).toBe(true);

    expect(
      toRecurrenceFields({
        recurrenceType: "daily",
        recurrenceDays: null,
        recurrenceCarryOver: 0 as unknown as boolean,
        status: "todo",
        completedAt: null,
      }).recurrenceCarryOver,
    ).toBe(false);
  });
});
