import { describe, it, expect, beforeAll } from "vitest";
import { ensureDbReady } from "@/lib/db";
import { getAlignmentDashboard } from "@/lib/services/alignment";
import { hasStrategy } from "@/lib/services/strategy";
import { resolveAlignmentPeriod, resolveReviewPeriod } from "@/lib/review/period";

describe("getAlignmentDashboard", () => {
  beforeAll(async () => {
    await ensureDbReady();
    if (!(await hasStrategy())) {
      throw new Error("no strategy in test database");
    }
  });

  it("scopes logged time to the current week in tz", async () => {
    const tz = "America/Toronto";
    const now = new Date("2026-06-18T15:00:00.000Z");
    const dashboard = await getAlignmentDashboard(tz, "week", now);
    const expected = resolveReviewPeriod("week", tz, now);

    expect(dashboard.period).toBe("week");
    expect(dashboard.periodStart).toBe(expected.periodStart);
    expect(dashboard.periodEnd).toBe(expected.periodEnd);
    expect(dashboard.alignment.totalLoggedMin).toBeGreaterThanOrEqual(0);
  });

  it("returns today range for period=today", async () => {
    const tz = "America/Toronto";
    const now = new Date("2026-06-18T15:00:00.000Z");
    const dashboard = await getAlignmentDashboard(tz, "today", now);
    const expected = resolveAlignmentPeriod("today", tz, now);

    expect(dashboard.period).toBe("today");
    expect(dashboard.periodStart).toBe(expected.periodStart);
    expect(dashboard.periodEnd).toBe(expected.periodEnd);
  });

  it("returns month range for period=month", async () => {
    const tz = "America/Toronto";
    const now = new Date("2026-06-18T15:00:00.000Z");
    const dashboard = await getAlignmentDashboard(tz, "month", now);
    const expected = resolveAlignmentPeriod("month", tz, now);

    expect(dashboard.period).toBe("month");
    expect(dashboard.periodStart).toBe(expected.periodStart);
    expect(dashboard.periodEnd).toBe(expected.periodEnd);
  });
});
