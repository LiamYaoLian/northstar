import { describe, it, expect, beforeAll } from "vitest";
import { ensureDbReady } from "@/lib/db";
import { getReviewDashboard, saveReviewSnapshot } from "@/lib/services/reviews";
import { anyUserIdWithStrategy } from "@/lib/test-helpers/auth";

describe("review snapshots", () => {
  let userId: string;

  beforeAll(async () => {
    await ensureDbReady();
    userId = await anyUserIdWithStrategy();
  });

  it("returns live dashboard and persists a snapshot", async () => {
    const tz = "America/Toronto";
    const dashboard = await getReviewDashboard(userId, "week", tz);
    expect(dashboard?.live.alignmentScore).toBeGreaterThanOrEqual(0);
    expect(dashboard?.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const saved = await saveReviewSnapshot(userId, "week", tz);
    expect(saved?.periodStart).toBe(dashboard?.periodStart);
    expect(saved?.highlights).not.toBeNull();

    const again = await getReviewDashboard(userId, "week", tz);
    expect(again?.saved?.id).toBe(saved?.id);
  });
});
