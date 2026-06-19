import { describe, expect, it } from "vitest";
import {
  formatTaskDate,
  isValidTaskDateRange,
  normalizeTaskDate,
  taskDateToInputValue,
} from "./task-dates";

describe("task-dates", () => {
  it("normalizes ISO timestamps to YYYY-MM-DD", () => {
    expect(normalizeTaskDate("2026-06-18T00:00:00.000Z")).toBe("2026-06-18");
  });

  it("formats calendar dates for display", () => {
    expect(formatTaskDate("2026-06-18", "en-US")).toMatch(/2026/);
  });

  it("converts stored values to date input values", () => {
    expect(taskDateToInputValue("2026-06-18T00:00:00.000Z")).toBe("2026-06-18");
  });

  it("validates start is on or before due", () => {
    expect(isValidTaskDateRange("2026-06-01", "2026-06-15")).toBe(true);
    expect(isValidTaskDateRange("2026-06-20", "2026-06-15")).toBe(false);
  });
});
