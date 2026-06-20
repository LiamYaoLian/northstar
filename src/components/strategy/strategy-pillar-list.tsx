"use client";

import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import {
  translateFocusTrack,
  translatePillar,
  translatePillarDescription,
} from "@/lib/i18n/entities";
import type { FocusTrack } from "@/lib/db/schema";
import type { StrategyPillar } from "@/lib/strategy/view-types";
import { parseJson } from "@/lib/utils";

function StrategyPillarCard({ pillar }: { pillar: StrategyPillar }) {
  const { locale, t } = useLocale();
  const tracks = parseJson<FocusTrack[]>(pillar.focusTracks, []);

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: pillar.color }}
          />
          <span className="font-medium">{translatePillar(pillar.name, locale)}</span>
        </div>
        <span className="text-sm text-muted">{pillar.targetPct}%</span>
      </div>
      {pillar.description && (
        <p className="text-sm text-muted">
          {translatePillarDescription(pillar.name, pillar.description, locale)}
        </p>
      )}
      <div className="flex flex-wrap gap-2 text-xs text-muted">
        {pillar.isHardConstraint && (
          <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">
            {t.common.floor}{" "}
            {pillar.floorMinPerWeek ? `${pillar.floorMinPerWeek}${t.common.perWeek}` : ""}
          </span>
        )}
        {pillar.capMaxPct && (
          <span className="rounded bg-red-50 px-2 py-0.5 text-red-700">
            {t.common.cap} {pillar.capMaxPct}%
          </span>
        )}
      </div>
      {tracks.length > 0 && (
        <div className="text-xs text-muted">
          {t.common.subTracks}：
          {tracks
            .map(
              (tr) =>
                `${translateFocusTrack(tr.name, locale)} ${tr.shareOfParent}%`,
            )
            .join(" · ")}
        </div>
      )}
    </Card>
  );
}

export function StrategyPillarList({ pillars }: { pillars: StrategyPillar[] }) {
  return (
    <div className="space-y-3">
      {pillars.map((pillar) => (
        <StrategyPillarCard key={pillar.id} pillar={pillar} />
      ))}
    </div>
  );
}
