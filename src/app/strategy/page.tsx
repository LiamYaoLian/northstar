"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
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
  const [strategy, setStrategy] = useState<Strategy | null>(null);

  useEffect(() => {
    fetch("/api/strategy")
      .then((r) => r.json())
      .then((d) => setStrategy(d.strategy));
  }, []);

  if (!strategy) {
    return <p className="text-sm text-muted">尚未定义战略。<a href="/onboarding" className="text-accent">开始 onboarding</a></p>;
  }

  const { northStar, pillars } = strategy;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Strategy</h2>
        <p className="text-sm text-muted">{northStar.horizon}</p>
      </div>

      <Card className="space-y-2">
        <h3 className="text-sm font-medium text-muted">North Star</h3>
        <p>{northStar.statement}</p>
        <p className="text-xs text-muted">
          每周 {northStar.hoursPerWeek}h 可规划
          {northStar.workPrimaryTrack &&
            ` · Work 主赛道：${northStar.workPrimaryTrack}`}
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
                  <span className="font-medium">{p.name}</span>
                </div>
                <span className="text-sm text-muted">{p.targetPct}%</span>
              </div>
              {p.description && (
                <p className="text-sm text-muted">{p.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                {p.isHardConstraint && (
                  <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">
                    floor {p.floorMinPerWeek ? `${p.floorMinPerWeek}min/周` : ""}
                  </span>
                )}
                {p.capMaxPct && (
                  <span className="rounded bg-red-50 px-2 py-0.5 text-red-700">
                    cap {p.capMaxPct}%
                  </span>
                )}
              </div>
              {tracks.length > 0 && (
                <div className="text-xs text-muted">
                  子赛道：{tracks.map((t) => `${t.name} ${t.shareOfParent}%`).join(" · ")}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <a
        href="/onboarding"
        className="inline-block text-sm text-accent"
      >
        重新设定战略 →
      </a>
    </div>
  );
}
