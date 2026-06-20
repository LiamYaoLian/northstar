"use client";

import { useLocale } from "@/lib/i18n/context";
import { translateFocusTrack } from "@/lib/i18n/entities";
import type { StrategyView } from "@/lib/strategy/view-types";

export function StrategyNorthStarDisplay({ strategy }: { strategy: StrategyView }) {
  const { locale, t } = useLocale();
  const { northStar } = strategy;

  return (
    <>
      <p>{northStar.statement}</p>
      <p className="text-xs text-muted">
        {northStar.hoursPerWeek}h {t.strategy.hoursPerWeek}
        {northStar.workPrimaryTrack &&
          ` · ${t.strategy.workPrimaryTrack}：${translateFocusTrack(northStar.workPrimaryTrack, locale)}`}
      </p>
    </>
  );
}
