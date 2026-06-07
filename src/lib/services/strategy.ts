import "server-only";

import { getDb } from "@/lib/db";
import {
  northStars,
  strategicPillars,
  strategyRevisions,
} from "@/lib/db/schema";
import { LIFE_BALANCE_TEMPLATE, WORK_TRACK_PRESETS } from "@/lib/strategy/templates";
import { id, nowIso } from "@/lib/utils";
import { eq } from "drizzle-orm";

export function hasStrategy() {
  const db = getDb();
  const stars = db.select().from(northStars).all();
  return stars.length > 0;
}

export function getStrategy() {
  const db = getDb();
  const star = db.select().from(northStars).all()[0];
  if (!star) return null;
  const pillars = db
    .select()
    .from(strategicPillars)
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return { northStar: star, pillars };
}

export function saveStrategy(input: {
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
  const db = getDb();
  const ts = nowIso();
  const existing = db.select().from(northStars).all()[0];

  if (existing) {
    db.delete(strategicPillars).run();
    db.update(northStars)
      .set({
        statement: input.statement,
        horizon: input.horizon,
        hoursPerWeek: input.hoursPerWeek,
        workPrimaryTrack: input.workPrimaryTrack ?? null,
        updatedAt: ts,
      })
      .where(eq(northStars.id, existing.id))
      .run();
  } else {
    db.insert(northStars)
      .values({
        id: id(),
        statement: input.statement,
        horizon: input.horizon,
        hoursPerWeek: input.hoursPerWeek,
        workPrimaryTrack: input.workPrimaryTrack ?? null,
        createdAt: ts,
        updatedAt: ts,
      })
      .run();
  }

  input.pillars.forEach((p, i) => {
    db.insert(strategicPillars)
      .values({
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
      })
      .run();
  });

  const pillars = db.select().from(strategicPillars).all();
  db.insert(strategyRevisions)
    .values({
      id: id(),
      northStarStatement: input.statement,
      horizon: input.horizon,
      pillars: JSON.stringify(pillars),
      effectiveFrom: ts,
      source: input.source ?? "onboarding",
      createdAt: ts,
    })
    .run();

  return getStrategy();
}

export function applyLifeBalanceTemplate(
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
