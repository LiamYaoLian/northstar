"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PillarBar } from "@/components/pillar-bar";
import { useLocale } from "@/lib/i18n/context";
import {
  translateFocusTrack,
  translateProcrastinationReason,
} from "@/lib/i18n/entities";
import type { AlignmentResult, FocusTrackAlignment, ProcrastinationSignal } from "@/lib/alignment";

export default function AlignmentPage() {
  const router = useRouter();
  const { locale, t } = useLocale();
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
    return <p className="text-sm text-muted">{t.common.loading}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t.alignment.title}</h2>
        <p className="text-sm text-muted">{t.alignment.subtitle}</p>
      </div>

      <Card>
        <div className="text-3xl font-semibold">{alignment.alignmentScore}</div>
        <p className="text-sm text-muted">{t.alignment.scoreLabel}</p>
        <p className="mt-2 text-xs text-muted">
          {t.alignment.loggedThisWeek}{" "}
          {Math.round((alignment.totalLoggedMin / 60) * 10) / 10}h
          {alignment.unallocatedPct > 0 &&
            ` · ${t.alignment.unallocated} ${alignment.unallocatedPct}%`}
        </p>
      </Card>

      <Card className="space-y-4">
        <h3 className="font-medium">{t.alignment.pillarDrift}</h3>
        {alignment.pillars.map((p) => (
          <PillarBar key={p.pillarId} pillar={p} />
        ))}
      </Card>

      {workTracks.length > 0 && (
        <Card className="space-y-3">
          <h3 className="font-medium">{t.alignment.workSubTracks}</h3>
          {workTracks.map((track) => (
            <div key={track.name} className="flex justify-between text-sm">
              <span>{translateFocusTrack(track.name, locale)}</span>
              <span className="text-muted">
                {t.common.target} {track.targetShare}% · {t.common.actual}{" "}
                {track.actualShare}%
                {track.drift !== 0 && (
                  <span
                    className={track.drift < 0 ? " text-amber-600" : " text-blue-600"}
                  >
                    {" "}
                    ({track.drift > 0 ? "+" : ""}
                    {track.drift}%)
                  </span>
                )}
              </span>
            </div>
          ))}
        </Card>
      )}

      {procrastination.length > 0 && (
        <Card className="space-y-3">
          <h3 className="font-medium">{t.alignment.procrastinationRadar}</h3>
          {procrastination.map((p) => (
            <div key={p.taskId} className="text-sm">
              <span className="font-medium">{p.title}</span>
              <span className="text-muted">
                {" "}
                — {translateProcrastinationReason(p.reason, locale)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
