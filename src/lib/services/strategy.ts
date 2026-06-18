import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import {
  northStars,
  strategicPillars,
  strategyRevisions,
} from "@/lib/db/schema";
import { LIFE_BALANCE_TEMPLATE, WORK_TRACK_PRESETS } from "@/lib/strategy/templates";
import { id, nowIso } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function hasStrategy() {
  await ensureDbReady();
  const stars = await getDb().select().from(northStars);
  return stars.length > 0;
}

export async function getStrategy() {
  await ensureDbReady();
  const db = getDb();
  const stars = await db.select().from(northStars);
  const star = stars[0];
  if (!star) return null;
  const pillars = (await db.select().from(strategicPillars)).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  return { northStar: star, pillars };
}

export async function saveStrategy(input: {
  statement: string;
  horizon: string;
  hoursPerWeek: number;
  workPrimaryTrack?: string;
  pillars: Array<{
    name: string;
    description?: string;
    targetPct: number;
    color: string;
    keywords: string[];
    focusTracks?: { name: string; shareOfParent: number }[];
    floorMinPerWeek?: number;
    capMaxPct?: number;
    isHardConstraint?: boolean;
  }>;
  source?: string;
}) {
  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const existingRows = await db.select().from(northStars);
  const existing = existingRows[0];

  if (existing) {
    await db.delete(strategicPillars);
    await db
      .update(northStars)
      .set({
        statement: input.statement,
        horizon: input.horizon,
        hoursPerWeek: input.hoursPerWeek,
        workPrimaryTrack: input.workPrimaryTrack ?? null,
        updatedAt: ts,
      })
      .where(eq(northStars.id, existing.id));
  } else {
    await db.insert(northStars).values({
      id: id(),
      statement: input.statement,
      horizon: input.horizon,
      hoursPerWeek: input.hoursPerWeek,
      workPrimaryTrack: input.workPrimaryTrack ?? null,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  for (const [i, p] of input.pillars.entries()) {
    await db.insert(strategicPillars).values({
      id: id(),
      name: p.name,
      description: p.description ?? null,
      targetPct: p.targetPct,
      color: p.color,
      keywords: JSON.stringify(p.keywords),
      focusTracks: p.focusTracks ? JSON.stringify(p.focusTracks) : null,
      floorMinPerWeek: p.floorMinPerWeek ?? null,
      capMaxPct: p.capMaxPct ?? null,
      isHardConstraint: p.isHardConstraint ?? false,
      sortOrder: i,
      createdAt: ts,
    });
  }

  const pillars = await db.select().from(strategicPillars);
  await db.insert(strategyRevisions).values({
    id: id(),
    northStarStatement: input.statement,
    horizon: input.horizon,
    pillars: JSON.stringify(pillars),
    effectiveFrom: ts,
    source: input.source ?? "onboarding",
    createdAt: ts,
  });

  return getStrategy();
}

export async function applyLifeBalanceTemplate(
  workTrack = "big_tech",
  overrides?: {
    statement?: string;
    horizon?: string;
    hoursPerWeek?: number;
  },
) {
  const preset = WORK_TRACK_PRESETS[workTrack] ?? WORK_TRACK_PRESETS.big_tech;
  const pillars = LIFE_BALANCE_TEMPLATE.pillars.map((p) => {
    if (p.name === "工作") {
      return { ...p, focusTracks: preset.focusTracks };
    }
    return p;
  });

  const primaryTrack =
    workTrack === "big_tech"
      ? "进大厂"
      : workTrack === "explore"
        ? "探索方向"
        : workTrack === "invest"
          ? "投资"
          : preset.focusTracks[0]?.name ?? "进大厂";

  return saveStrategy({
    statement: overrides?.statement ?? LIFE_BALANCE_TEMPLATE.northStar,
    horizon: overrides?.horizon ?? LIFE_BALANCE_TEMPLATE.horizon,
    hoursPerWeek: overrides?.hoursPerWeek ?? 40,
    workPrimaryTrack: primaryTrack,
    pillars,
    source: "template",
  });
}
