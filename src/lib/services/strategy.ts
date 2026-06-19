import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import {
  northStars,
  strategicPillars,
  strategyRevisions,
} from "@/lib/db/schema";
import { LIFE_BALANCE_TEMPLATE, WORK_TRACK_PRESETS } from "@/lib/strategy/templates";
import {
  focusTracksForWorkTrack,
  primaryTrackFromWorkTrackKey,
} from "@/lib/strategy/work-track";
import { id, nowIso } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function hasStrategy(userId?: string) {
  await ensureDbReady();
  const query = getDb().select().from(northStars);
  const stars = userId
    ? await query.where(eq(northStars.userId, userId))
    : await query;
  return stars.length > 0;
}

export async function getStrategy(userId?: string) {
  await ensureDbReady();
  const db = getDb();
  const starRows = db.select().from(northStars);
  const stars = userId
    ? await starRows.where(eq(northStars.userId, userId))
    : await starRows;
  const star = stars[0];
  if (!star) return null;
  const pillarRows = db.select().from(strategicPillars);
  const pillars = (userId
    ? await pillarRows.where(eq(strategicPillars.userId, userId))
    : await pillarRows
  ).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  return { northStar: star, pillars };
}

export async function saveStrategy(userId: string | undefined, input: {
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
  const existingQuery = db.select().from(northStars);
  const existingRows = userId
    ? await existingQuery.where(eq(northStars.userId, userId))
    : await existingQuery;
  const existing = existingRows[0];

  if (existing) {
    const deletePillars = db.delete(strategicPillars);
    if (userId) {
      await deletePillars.where(eq(strategicPillars.userId, userId));
    } else {
      await deletePillars;
    }
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
      userId: userId ?? null,
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
      userId: userId ?? null,
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

  const pillarRows = db.select().from(strategicPillars);
  const pillars = userId
    ? await pillarRows.where(eq(strategicPillars.userId, userId))
    : await pillarRows;
  await db.insert(strategyRevisions).values({
    id: id(),
    userId: userId ?? null,
    northStarStatement: input.statement,
    horizon: input.horizon,
    pillars: JSON.stringify(pillars),
    effectiveFrom: ts,
    source: input.source ?? "onboarding",
    createdAt: ts,
  });

  return getStrategy(userId);
}

export async function updateNorthStar(input: {
  statement: string;
  horizon: string;
  hoursPerWeek: number;
  workTrack: string;
}, userId?: string) {
  const strategy = await getStrategy(userId);
  if (!strategy) return null;

  const statement = input.statement.trim();
  const horizon = input.horizon.trim();
  if (!statement || !horizon) return null;
  if (!Number.isInteger(input.hoursPerWeek) || input.hoursPerWeek < 1) {
    return null;
  }

  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const workPrimaryTrack = primaryTrackFromWorkTrackKey(input.workTrack);
  const focusTracks = focusTracksForWorkTrack(input.workTrack);

  const workPillar = strategy.pillars.find((p) => p.name === "工作");
  if (workPillar) {
    await db
      .update(strategicPillars)
      .set({ focusTracks: JSON.stringify(focusTracks) })
      .where(eq(strategicPillars.id, workPillar.id));
  }

  await db
    .update(northStars)
    .set({
      statement,
      horizon,
      hoursPerWeek: input.hoursPerWeek,
      workPrimaryTrack,
      updatedAt: ts,
    })
    .where(eq(northStars.id, strategy.northStar.id));

  const revisionPillarRows = db.select().from(strategicPillars);
  const pillars = userId
    ? await revisionPillarRows.where(eq(strategicPillars.userId, userId))
    : await revisionPillarRows;
  await db.insert(strategyRevisions).values({
    id: id(),
    userId: userId ?? null,
    northStarStatement: statement,
    horizon,
    pillars: JSON.stringify(pillars),
    effectiveFrom: ts,
    source: "strategy_edit",
    createdAt: ts,
  });

  return getStrategy(userId);
}

export async function applyLifeBalanceTemplate(
  userId: string | undefined,
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

  return saveStrategy(userId, {
    statement: overrides?.statement ?? LIFE_BALANCE_TEMPLATE.northStar,
    horizon: overrides?.horizon ?? LIFE_BALANCE_TEMPLATE.horizon,
    hoursPerWeek: overrides?.hoursPerWeek ?? 40,
    workPrimaryTrack: primaryTrackFromWorkTrackKey(workTrack),
    pillars,
    source: "template",
  });
}
