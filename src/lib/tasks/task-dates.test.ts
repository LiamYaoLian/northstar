import { describe, expect, it } from "vitest";
import {
  defaultTaskStartAtInputValue,
  formatTaskDate,
  formatTaskStartAt,
  isValidTaskDateRange,
  normalizeTaskDate,
  normalizeTaskStartAt,
  resolveTaskStartAt,
  taskDateToInputValue,
  taskStartAtToInputValue,
} from "./task-dates";
import { localDateTimeInputToIso } from "./timezone";

const TZ = "America/New_York";

describe("task-dates", () => {
  it("normalizes ISO timestamps to YYYY-MM-DD for due dates", () => {
    expect(normalizeTaskDate("2026-06-18T00:00:00.000Z")).toBe("2026-06-18");
  });

  it("normalizes datetime-local start values to ISO UTC", () => {
    const iso = normalizeTaskStartAt("2026-06-18T14:30", TZ);
    expect(iso).toBe(localDateTimeInputToIso("2026-06-18T14:30", TZ));
  });

  it("normalizes date-only start values to start of local day", () => {
    const iso = normalizeTaskStartAt("2026-06-18", TZ);
    expect(iso).toBe(localDateTimeInputToIso("2026-06-18T00:00", TZ));
  });

  it("formats start with date and time", () => {
    const iso = localDateTimeInputToIso("2026-06-18T14:30", TZ)!;
    expect(formatTaskStartAt(iso, "en-US", TZ)).toMatch(/6/);
  });

  it("converts stored start to datetime-local input", () => {
    const iso = localDateTimeInputToIso("2026-06-18T09:15", TZ)!;
    expect(taskStartAtToInputValue(iso, TZ)).toBe("2026-06-18T09:15");
  });

  it("formats calendar dates for display", () => {
    expect(formatTaskDate("2026-06-18", "en-US")).toMatch(/2026/);
  });

  it("converts stored due values to date input values", () => {
    expect(taskDateToInputValue("2026-06-18T00:00:00.000Z")).toBe("2026-06-18");
  });

  it("validates start local date is on or before due date", () => {
    expect(
      isValidTaskDateRange(
        localDateTimeInputToIso("2026-06-01T23:59", TZ),
        "2026-06-15",
        TZ,
      ),
    ).toBe(true);
    expect(
      isValidTaskDateRange(
        localDateTimeInputToIso("2026-06-20T08:00", TZ),
        "2026-06-15",
        TZ,
      ),
    ).toBe(false);
  });

  it("defaults missing start to an ISO timestamp", () => {
    expect(resolveTaskStartAt(null, TZ)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(resolveTaskStartAt("2026-06-18T10:00", TZ)).toBe(
      localDateTimeInputToIso("2026-06-18T10:00", TZ),
    );
  });

  it("provides datetime-local default for create form", () => {
    expect(defaultTaskStartAtInputValue(TZ)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
