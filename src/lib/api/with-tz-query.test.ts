import { describe, it, expect, vi, afterEach } from "vitest";
import * as timezone from "@/lib/tasks/timezone";
import {
  shouldAutoAppendTimezone,
  withAutoTimezone,
  TZ_PREFIXES,
} from "./with-tz-query";
import { DEFAULT_TIMEZONE } from "@/lib/tasks/timezone";

describe("shouldAutoAppendTimezone", () => {
  it.each(TZ_PREFIXES)("returns true for %s prefix", (prefix) => {
    expect(shouldAutoAppendTimezone(`${prefix}?sort=manual`)).toBe(true);
    expect(shouldAutoAppendTimezone(`${prefix}/today`)).toBe(true);
  });

  it("returns false for unrelated API routes", () => {
    expect(shouldAutoAppendTimezone("/api/strategy")).toBe(false);
  });
});

describe("withAutoTimezone", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appends tz when missing for /api/completions", () => {
    vi.spyOn(timezone, "clientTimezone").mockReturnValue("Asia/Shanghai");
    expect(
      withAutoTimezone("/api/completions?since=2025-01-06&until=2025-01-06"),
    ).toBe(
      "/api/completions?since=2025-01-06&until=2025-01-06&tz=Asia%2FShanghai",
    );
  });

  it("appends tz when missing for /api/subtasks/id", () => {
    expect(withAutoTimezone("/api/subtasks/s1")).toContain("tz=");
  });

  it("appends tz for PATCH task by id paths", () => {
    expect(withAutoTimezone("/api/tasks/task-123")).toContain("tz=");
  });

  it("appends tz for nested task routes", () => {
    expect(withAutoTimezone("/api/tasks/task-1/subtasks/reorder")).toContain("tz=");
  });

  it("appends tz for /api/completions/summary", () => {
    expect(
      withAutoTimezone("/api/completions/summary?since=2025-01-06&until=2025-01-12"),
    ).toContain("tz=");
  });

  it("appends tz for /api/completions/export", () => {
    expect(
      withAutoTimezone("/api/completions/export?since=2025-01-06&until=2025-01-12"),
    ).toContain("tz=");
  });

  it("appends tz for /api/time-entries/export", () => {
    expect(
      withAutoTimezone("/api/time-entries/export?since=2025-01-06&until=2025-01-12"),
    ).toContain("tz=");
  });

  it("does not override existing tz", () => {
    const url = "/api/tasks/today?tz=Europe/London";
    expect(withAutoTimezone(url)).toBe(url);
  });

  it("leaves non-task URLs unchanged", () => {
    expect(withAutoTimezone("/api/strategy")).toBe("/api/strategy");
  });

  it("uses DEFAULT_TIMEZONE when clientTimezone returns default", () => {
    vi.spyOn(timezone, "clientTimezone").mockReturnValue(DEFAULT_TIMEZONE);
    expect(
      withAutoTimezone("/api/completions?since=2025-01-01&until=2025-01-01"),
    ).toContain(`tz=${encodeURIComponent(DEFAULT_TIMEZONE)}`);
  });
});
