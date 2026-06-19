import { describe, it, expect, beforeAll } from "vitest";
import { ensureDbReady } from "@/lib/db";
import { listTimeEntriesForExport } from "@/lib/services/time-entries-export";
import { anyUserIdWithStrategy } from "@/lib/test-helpers/auth";
import { resolveReviewPeriod } from "@/lib/review/period";

describe("listTimeEntriesForExport", () => {
  let userId: string;

  beforeAll(async () => {
    await ensureDbReady();
    userId = await anyUserIdWithStrategy();
  });

  it("returns rows for the requested date range", async () => {
    const tz = "America/Toronto";
    const range = resolveReviewPeriod("week", tz, new Date("2026-06-18T15:00:00.000Z"));
    const rows = await listTimeEntriesForExport(
      userId,
      range.periodStart,
      range.periodEnd,
      tz,
    );
    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      expect(row.durationMin).toBeGreaterThan(0);
      expect(row.taskTitle.length).toBeGreaterThan(0);
    }
  });
});
