import { describe, it, expect, beforeAll } from "vitest";
import { ensureDbReady, getDb } from "@/lib/db";
import { getStrategy, updateNorthStar } from "@/lib/services/strategy";
import { strategyRevisions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

describe("updateNorthStar", () => {
  beforeAll(async () => {
    await ensureDbReady();
    const strategy = await getStrategy();
    if (!strategy) throw new Error("no strategy in test database");
  });

  it("updates north star fields and writes a revision", async () => {
    const before = await getStrategy();
    if (!before) throw new Error("no strategy");

    const updated = await updateNorthStar({
      statement: "Updated north star for tests",
      horizon: "2026 Q3",
      hoursPerWeek: 35,
      workTrack: "explore",
    });
    expect(updated?.northStar.statement).toBe("Updated north star for tests");
    expect(updated?.northStar.horizon).toBe("2026 Q3");
    expect(updated?.northStar.hoursPerWeek).toBe(35);
    expect(updated?.northStar.workPrimaryTrack).toBe("探索方向");

    const workPillar = updated?.pillars.find((p) => p.name === "工作");
    expect(workPillar?.focusTracks).toContain("探索方向");

    const [revision] = await getDb()
      .select()
      .from(strategyRevisions)
      .orderBy(desc(strategyRevisions.createdAt))
      .limit(1);
    expect(revision?.source).toBe("strategy_edit");

    await updateNorthStar({
      statement: before.northStar.statement,
      horizon: before.northStar.horizon,
      hoursPerWeek: before.northStar.hoursPerWeek,
      workTrack: "big_tech",
    });
  });
});
