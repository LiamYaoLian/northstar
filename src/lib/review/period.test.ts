import { describe, it, expect } from "vitest";
import {
  filterTimeEntriesInDateRange,
  isDateInRange,
  parseAlignmentPeriod,
  resolveAlignmentPeriod,
  resolveReviewPeriod,
  reviewPeriodFromAlignment,
} from "./period";
import type { TimeEntry } from "@/lib/db/schema";

const TZ = "America/New_York";

describe("resolveReviewPeriod", () => {
  it("returns monday through today for week", () => {
    const now = new Date("2026-06-18T15:00:00.000Z");
    const range = resolveReviewPeriod("week", TZ, now);
    expect(range.periodStart).toBe("2026-06-15");
    expect(range.periodEnd).toBe("2026-06-18");
  });

  it("returns month start through today for month", () => {
    const now = new Date("2026-06-18T15:00:00.000Z");
    const range = resolveReviewPeriod("month", TZ, now);
    expect(range.periodStart).toBe("2026-06-01");
    expect(range.periodEnd).toBe("2026-06-18");
  });
});

describe("resolveAlignmentPeriod", () => {
  const now = new Date("2026-06-18T15:00:00.000Z");

  it("returns single day for today", () => {
    const range = resolveAlignmentPeriod("today", TZ, now);
    expect(range.periodStart).toBe("2026-06-18");
    expect(range.periodEnd).toBe("2026-06-18");
  });

  it("delegates week and month to review period", () => {
    expect(resolveAlignmentPeriod("week", TZ, now)).toEqual(
      resolveReviewPeriod("week", TZ, now),
    );
    expect(resolveAlignmentPeriod("month", TZ, now)).toEqual(
      resolveReviewPeriod("month", TZ, now),
    );
  });

  it("returns wide range for all", () => {
    const range = resolveAlignmentPeriod("all", TZ, now);
    expect(range.periodStart).toBe("2000-01-01");
    expect(range.periodEnd).toBe("2099-12-31");
  });
});

describe("parseAlignmentPeriod", () => {
  it("defaults to week and accepts known values", () => {
    expect(parseAlignmentPeriod(null)).toBe("week");
    expect(parseAlignmentPeriod("today")).toBe("today");
    expect(parseAlignmentPeriod("month")).toBe("month");
    expect(parseAlignmentPeriod("all")).toBe("all");
    expect(parseAlignmentPeriod("invalid")).toBe("week");
  });
});

describe("reviewPeriodFromAlignment", () => {
  it("maps week and month only", () => {
    expect(reviewPeriodFromAlignment("week")).toBe("week");
    expect(reviewPeriodFromAlignment("month")).toBe("month");
    expect(reviewPeriodFromAlignment("today")).toBeNull();
    expect(reviewPeriodFromAlignment("all")).toBeNull();
  });
});

describe("filterTimeEntriesInDateRange", () => {
  const entries: TimeEntry[] = [
    {
      id: "e1",
      taskId: "t1",
      startedAt: "2026-06-16T12:00:00.000Z",
      durationMin: 30,
      source: "manual",
      note: null,
      createdAt: "2026-06-16T12:00:00.000Z",
    },
    {
      id: "e2",
      taskId: "t1",
      startedAt: "2026-06-10T12:00:00.000Z",
      durationMin: 60,
      source: "manual",
      note: null,
      createdAt: "2026-06-10T12:00:00.000Z",
    },
  ];

  it("keeps entries whose local day falls in range", () => {
    const filtered = filterTimeEntriesInDateRange(
      entries,
      "2026-06-16",
      "2026-06-18",
      TZ,
    );
    expect(filtered.map((e) => e.id)).toEqual(["e1"]);
  });
});

describe("isDateInRange", () => {
  it("compares YYYY-MM-DD strings inclusively", () => {
    expect(isDateInRange("2026-06-17", "2026-06-16", "2026-06-18")).toBe(true);
    expect(isDateInRange("2026-06-15", "2026-06-16", "2026-06-18")).toBe(false);
  });
});
