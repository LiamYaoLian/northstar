import { describe, it, expect } from "vitest";
import {
  completionQueryForAlignmentWeek,
  completionQueryForPageRange,
  completionQueryForToday,
} from "./completion-ranges";
import {
  TEST_TZ,
  MONDAY_10AM_NY,
  WEDNESDAY_10AM_NY,
} from "./recurrence-test-helpers";

describe("completionQueryForToday", () => {
  it("returns same since and until for local today", () => {
    expect(completionQueryForToday(TEST_TZ, MONDAY_10AM_NY)).toEqual({
      since: "2025-01-06",
      until: "2025-01-06",
    });
  });

  it("uses local date near UTC midnight boundary", () => {
    const mondayNightNy = new Date("2025-01-07T03:00:00.000Z");
    expect(completionQueryForToday(TEST_TZ, mondayNightNy)).toEqual({
      since: "2025-01-06",
      until: "2025-01-06",
    });
  });
});

describe("completionQueryForPageRange", () => {
  it("today matches completionQueryForToday", () => {
    expect(completionQueryForPageRange("today", TEST_TZ, MONDAY_10AM_NY)).toEqual(
      completionQueryForToday(TEST_TZ, MONDAY_10AM_NY),
    );
  });

  it("week spans Monday through today local", () => {
    expect(completionQueryForPageRange("week", TEST_TZ, WEDNESDAY_10AM_NY)).toEqual({
      since: "2025-01-06",
      until: "2025-01-08",
    });
  });

  it("all returns null to mean unbounded client query", () => {
    expect(completionQueryForPageRange("all", TEST_TZ, WEDNESDAY_10AM_NY)).toBeNull();
  });
});

describe("completionQueryForAlignmentWeek", () => {
  it("matches week range ending today", () => {
    expect(completionQueryForAlignmentWeek(TEST_TZ, WEDNESDAY_10AM_NY)).toEqual({
      since: "2025-01-06",
      until: "2025-01-08",
    });
  });
});
