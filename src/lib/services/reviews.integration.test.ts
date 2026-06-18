import { describe, it, expect, beforeAll } from "vitest";
import { ensureDbReady } from "@/lib/db";
import { getReviewDashboard, saveReviewSnapshot } from "@/lib/services/reviews";
import { hasStrategy } from "@/lib/services/strategy";

describe("review snapshots", () => {
  beforeAll(async () => {
    await ensureDbReady();
    if (!(await hasStrategy())) {
      throw new Error("no strategy in test database");
    }
  });

  it("returns live dashboard and persists a snapshot", async () => {
    const tz = "America/Toronto";
    const dashboard = await getReviewDashboard("week", tz);
    expect(dashboard?.live.alignmentScore).toBeGreaterThanOrEqual(0);
    expect(dashboard?.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const saved = await saveReviewSnapshot("week", tz);
    expect(saved?.periodStart).toBe(dashboard?.periodStart);
    expect(saved?.highlights).not.toBeNull();

    const again = await getReviewDashboard("week", tz);
    expect(again?.saved?.id).toBe(saved?.id);
  });
});
