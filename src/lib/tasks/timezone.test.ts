import { describe, it, expect } from "vitest";
import {
  DEFAULT_TIMEZONE,
  InvalidTimezoneError,
  addLocalDays,
  clientTimezone,
  endOfLocalDay,
  isValidTimezone,
  isoWeekdayInTz,
  resolveTimezone,
  startOfLocalDay,
} from "./timezone";
import { TEST_TZ, MONDAY_10AM_NY, TUESDAY_10AM_NY } from "./recurrence-test-helpers";

describe("resolveTimezone", () => {
  it("returns America/New_York when tz is missing", () => {
    expect(resolveTimezone(null)).toBe(DEFAULT_TIMEZONE);
    expect(resolveTimezone(undefined)).toBe(DEFAULT_TIMEZONE);
    expect(resolveTimezone("")).toBe(DEFAULT_TIMEZONE);
  });

  it("returns the same tz when valid", () => {
    expect(resolveTimezone("Asia/Shanghai")).toBe("Asia/Shanghai");
    expect(resolveTimezone(TEST_TZ)).toBe(TEST_TZ);
  });

  it("throws InvalidTimezoneError for invalid IANA tz", () => {
    expect(() => resolveTimezone("Foo/Bar")).toThrow(InvalidTimezoneError);
  });
});

describe("isValidTimezone", () => {
  it("accepts known IANA zones", () => {
    expect(isValidTimezone(TEST_TZ)).toBe(true);
    expect(isValidTimezone("UTC")).toBe(true);
  });

  it("rejects invalid zones", () => {
    expect(isValidTimezone("Foo/Bar")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });
});

describe("isoWeekdayInTz", () => {
  it("maps Monday to 1 and Sunday to 7 in America/New_York", () => {
    expect(isoWeekdayInTz(MONDAY_10AM_NY, TEST_TZ)).toBe(1);
    // 2025-01-05 is Sunday 10am NY
    expect(isoWeekdayInTz(new Date("2025-01-05T15:00:00.000Z"), TEST_TZ)).toBe(7);
  });
});

describe("startOfLocalDay / endOfLocalDay", () => {
  it("startOfLocalDay returns local midnight as UTC instant", () => {
    const start = startOfLocalDay(MONDAY_10AM_NY, TEST_TZ);
    // Mon 2025-01-06 00:00 EST = 2025-01-06T05:00:00.000Z
    expect(start.toISOString()).toBe("2025-01-06T05:00:00.000Z");
  });

  it("endOfLocalDay is after startOfLocalDay on the same calendar day", () => {
    const start = startOfLocalDay(MONDAY_10AM_NY, TEST_TZ);
    const end = endOfLocalDay(MONDAY_10AM_NY, TEST_TZ);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
    expect(end.getTime() - start.getTime()).toBeLessThan(24 * 60 * 60 * 1000);
  });

  it("compares completedAt ISO string against startOfLocalDay using instants", () => {
    const completedAt = "2025-01-06T20:00:00.000Z"; // Mon 3pm NY
    const start = startOfLocalDay(MONDAY_10AM_NY, TEST_TZ);
    expect(Date.parse(completedAt)).toBeGreaterThanOrEqual(start.getTime());
  });
});

describe("addLocalDays", () => {
  it("advances calendar day in tz (not fixed 86400000ms across DST start)", () => {
    const next = addLocalDays(MONDAY_10AM_NY, TEST_TZ, 1);
    expect(isoWeekdayInTz(next, TEST_TZ)).toBe(2);
  });

  it("crosses UTC date boundary correctly for NY", () => {
    const mondayNight = new Date("2025-01-07T03:00:00.000Z"); // Mon ~10pm NY
    const next = addLocalDays(mondayNight, TEST_TZ, 1);
    expect(isoWeekdayInTz(next, TEST_TZ)).toBe(isoWeekdayInTz(TUESDAY_10AM_NY, TEST_TZ));
  });
});

describe("clientTimezone", () => {
  it("returns a valid IANA timezone", () => {
    expect(isValidTimezone(clientTimezone())).toBe(true);
  });
});

describe("DST edge (America/New_York spring forward)", () => {
  /** 2025-03-09 02:30 EST does not exist; clocks jump 2am → 3am */
  const sundayBeforeDst = new Date("2025-03-09T06:30:00.000Z"); // Sun 1:30am EST

  it("addLocalDays advances one calendar day across spring-forward", () => {
    const next = addLocalDays(sundayBeforeDst, TEST_TZ, 1);
    expect(isoWeekdayInTz(next, TEST_TZ)).toBe(1); // Monday Mar 10
  });

  it("startOfLocalDay on spring-forward Sunday is stable UTC instant", () => {
    const start = startOfLocalDay(sundayBeforeDst, TEST_TZ);
    expect(start.toISOString()).toBe("2025-03-09T05:00:00.000Z");
  });
});
