import { describe, it, expect, beforeAll } from "vitest";
import { ensureDbReady, getDb } from "@/lib/db";
import { strategyRevisions, users } from "@/lib/db/schema";
import { getStrategy, saveStrategy, updateNorthStar } from "@/lib/services/strategy";
import { id, nowIso } from "@/lib/utils";
import { and, desc, eq } from "drizzle-orm";

async function createTestUser(label: string) {
  const userId = id();
  const ts = nowIso();
  await getDb().insert(users).values({
    id: userId,
    name: `Strategy update ${label}`,
    email: `strategy-update-${label}-${userId}@example.com`,
    emailVerified: null,
    image: null,
    createdAt: ts,
    updatedAt: ts,
  });
  return userId;
}

function strategyInput(label: string) {
  return {
    statement: `${label} north star`,
    horizon: "2026 Q4",
    hoursPerWeek: 40,
    pillars: [
      {
        name: "工作",
        targetPct: 60,
        color: "#3b82f6",
        keywords: ["work"],
        focusTracks: [{ name: "进大厂", shareOfParent: 100 }],
      },
      {
        name: "健康",
        targetPct: 40,
        color: "#22c55e",
        keywords: ["health"],
      },
    ],
    source: "strategy_update_test",
  };
}

describe("updateNorthStar", () => {
  beforeAll(async () => {
    await ensureDbReady();
  });

  it("updates north star fields and writes a revision", async () => {
    const userId = await createTestUser("update");
    await saveStrategy(userId, strategyInput("update"));

    const before = await getStrategy(userId);
    if (!before) throw new Error("no strategy");

    const updated = await updateNorthStar(
      {
        statement: "Updated north star for tests",
        horizon: "2026 Q3",
        hoursPerWeek: 35,
        workTrack: "explore",
      },
      userId,
    );
    expect(updated?.northStar.statement).toBe("Updated north star for tests");
    expect(updated?.northStar.horizon).toBe("2026 Q3");
    expect(updated?.northStar.hoursPerWeek).toBe(35);
    expect(updated?.northStar.workPrimaryTrack).toBe("探索方向");

    const workPillar = updated?.pillars.find((p) => p.name === "工作");
    expect(workPillar?.focusTracks).toContain("探索方向");

    const [revision] = await getDb()
      .select()
      .from(strategyRevisions)
      .where(
        and(
          eq(strategyRevisions.userId, userId),
          eq(strategyRevisions.source, "strategy_edit"),
        ),
      )
      .orderBy(desc(strategyRevisions.createdAt))
      .limit(1);
    expect(revision?.northStarStatement).toBe("Updated north star for tests");
    expect(revision?.source).toBe("strategy_edit");

    await updateNorthStar(
      {
        statement: before.northStar.statement,
        horizon: before.northStar.horizon,
        hoursPerWeek: before.northStar.hoursPerWeek,
        workTrack: "big_tech",
      },
      userId,
    );
  });
});
