"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import {
  translateFocusTrack,
  translatePillar,
  translatePillarDescription,
} from "@/lib/i18n/entities";
import { parseJson } from "@/lib/utils";
import type { FocusTrack } from "@/lib/db/schema";

type Pillar = {
  id: string;
  name: string;
  description: string | null;
  targetPct: number;
  color: string;
  keywords: string;
  focusTracks: string | null;
  floorMinPerWeek: number | null;
  capMaxPct: number | null;
  isHardConstraint: boolean;
};

type Strategy = {
  northStar: {
    statement: string;
    horizon: string;
    hoursPerWeek: number;
    workPrimaryTrack: string | null;
  };
  pillars: Pillar[];
};

export default function StrategyPage() {
  const { locale, t } = useLocale();
  const [strategy, setStrategy] = useState<Strategy | null>(null);

  useEffect(() => {
    fetch("/api/strategy")
      .then((r) => r.json())
      .then((d) => setStrategy(d.strategy));
  }, []);

  if (!strategy) {
    return (
      <p className="text-sm text-muted">
        {t.strategy.notDefined}{" "}
        <Link href="/onboarding" className="text-accent">
          {t.strategy.startOnboarding}
        </Link>
      </p>
    );
  }

  const { northStar, pillars } = strategy;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t.strategy.title}</h2>
        <p className="text-sm text-muted">{northStar.horizon}</p>
      </div>

      <Card className="space-y-2">
        <h3 className="text-sm font-medium text-muted">{t.strategy.northStar}</h3>
        <p>{northStar.statement}</p>
        <p className="text-xs text-muted">
          {northStar.hoursPerWeek}h {t.strategy.hoursPerWeek}
          {northStar.workPrimaryTrack &&
            ` · ${t.strategy.workPrimaryTrack}：${translateFocusTrack(northStar.workPrimaryTrack, locale)}`}
        </p>
      </Card>

      <div className="space-y-3">
        {pillars.map((p) => {
          const tracks = parseJson<FocusTrack[]>(p.focusTracks, []);
          return (
            <Card key={p.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-medium">
                    {translatePillar(p.name, locale)}
                  </span>
                </div>
                <span className="text-sm text-muted">{p.targetPct}%</span>
              </div>
              {p.description && (
                <p className="text-sm text-muted">
                  {translatePillarDescription(p.name, p.description, locale)}
                </p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                {p.isHardConstraint && (
                  <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">
                    {t.common.floor}{" "}
                    {p.floorMinPerWeek
                      ? `${p.floorMinPerWeek}${t.common.perWeek}`
                      : ""}
                  </span>
                )}
                {p.capMaxPct && (
                  <span className="rounded bg-red-50 px-2 py-0.5 text-red-700">
                    {t.common.cap} {p.capMaxPct}%
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
        })}
      </div>

      <Link href="/onboarding" className="inline-block text-sm text-accent">
        {t.strategy.resetStrategy}
      </Link>
    </div>
  );
}
