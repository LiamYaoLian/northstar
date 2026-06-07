"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PillarBar } from "@/components/pillar-bar";
import type { AlignmentResult, FocusTrackAlignment, ProcrastinationSignal } from "@/lib/alignment";

export default function AlignmentPage() {
  const router = useRouter();
  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);
  const [workTracks, setWorkTracks] = useState<FocusTrackAlignment[]>([]);
  const [procrastination, setProcrastination] = useState<ProcrastinationSignal[]>([]);

  useEffect(() => {
    fetch("/api/alignment")
      .then((r) => r.json())
      .then((data) => {
        if (!data.alignment) {
          router.replace("/onboarding");
          return;
        }
        setAlignment(data.alignment);
        setWorkTracks(data.workTracks ?? []);
        setProcrastination(data.procrastination ?? []);
      });
  }, [router]);

  if (!alignment) {
    return <p className="text-sm text-muted">加载中...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Alignment</h2>
        <p className="text-sm text-muted">战略对齐仪表盘</p>
      </div>

      <Card>
        <div className="text-3xl font-semibold">{alignment.alignmentScore}</div>
        <p className="text-sm text-muted">对齐分数 / 100</p>
        <p className="mt-2 text-xs text-muted">
          本周记录 {Math.round(alignment.totalLoggedMin / 60 * 10) / 10}h
          {alignment.unallocatedPct > 0 &&
            ` · 未归类 ${alignment.unallocatedPct}%`}
        </p>
      </Card>

      <Card className="space-y-4">
        <h3 className="font-medium">Pillar 偏离</h3>
        {alignment.pillars.map((p) => (
          <PillarBar key={p.pillarId} pillar={p} />
        ))}
      </Card>

      {workTracks.length > 0 && (
        <Card className="space-y-3">
          <h3 className="font-medium">工作 · 子赛道</h3>
          {workTracks.map((t) => (
            <div key={t.name} className="flex justify-between text-sm">
              <span>{t.name}</span>
              <span className="text-muted">
                目标 {t.targetShare}% · 实际 {t.actualShare}%
                {t.drift !== 0 && (
                  <span className={t.drift < 0 ? " text-amber-600" : " text-blue-600"}>
                    {" "}
                    ({t.drift > 0 ? "+" : ""}
                    {t.drift}%)
                  </span>
                )}
              </span>
            </div>
          ))}
        </Card>
      )}

      {procrastination.length > 0 && (
        <Card className="space-y-3">
          <h3 className="font-medium">Procrastination Radar</h3>
          {procrastination.map((p) => (
            <div key={p.taskId} className="text-sm">
              <span className="font-medium">{p.title}</span>
              <span className="text-muted"> — {p.reason}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
