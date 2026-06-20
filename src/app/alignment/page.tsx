"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlignmentCompletionLog } from "@/components/alignment/alignment-completion-log";
import { AlignmentKpiCards } from "@/components/alignment/alignment-kpi-cards";
import { AlignmentPageToolbar } from "@/components/alignment/alignment-page-toolbar";
import { AlignmentPillarSection } from "@/components/alignment/alignment-pillar-section";
import { AlignmentProcrastinationSection } from "@/components/alignment/alignment-procrastination-section";
import { AlignmentSnapshotSection } from "@/components/alignment/alignment-snapshot-section";
import { AlignmentWorkTracksSection } from "@/components/alignment/alignment-work-tracks-section";
import { useAlignmentPageData } from "@/lib/hooks/use-alignment-page-data";
import { useLocale } from "@/lib/i18n/context";
import type { AlignmentPeriod } from "@/lib/review/period";

function AlignmentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const period = (searchParams.get("period") as AlignmentPeriod | null) ?? "week";
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const {
    alignment,
    driftScore,
    workTracks,
    procrastination,
    events,
    pillars,
    periodStart,
    periodEnd,
    reviewDashboard,
    loading,
    saving,
    message,
    error,
    reviewPeriod,
    timeExportHref,
    completionExportHref,
    reload,
    saveSnapshot,
  } = useAlignmentPageData(period, categoryFilter);

  const setPeriod = useCallback(
    (next: AlignmentPeriod) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", next);
      router.replace(`/alignment?${params.toString()}`);
    },
    [router, searchParams],
  );

  if (loading && !alignment) {
    return <p className="text-sm text-muted">{t.common.loading}</p>;
  }

  if (error && !alignment) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-800">{error}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="text-sm text-accent underline"
        >
          {t.common.retry}
        </button>
      </div>
    );
  }

  if (!alignment) {
    return null;
  }

  return (
    <div className="space-y-8">
      <AlignmentPageToolbar
        period={period}
        periodStart={periodStart}
        periodEnd={periodEnd}
        saving={saving}
        reviewPeriod={reviewPeriod}
        timeExportHref={timeExportHref}
        completionExportHref={completionExportHref}
        onPeriodChange={setPeriod}
        onSaveSnapshot={() => void saveSnapshot()}
      />

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <AlignmentKpiCards
        alignmentScore={alignment.alignmentScore}
        driftScore={driftScore}
        totalLoggedMin={alignment.totalLoggedMin}
        totalCompletions={events.length}
      />

      <AlignmentPillarSection pillars={alignment.pillars} />

      <AlignmentWorkTracksSection workTracks={workTracks} />

      <AlignmentProcrastinationSection signals={procrastination} />

      <AlignmentCompletionLog
        events={events}
        pillars={pillars}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
      />

      <AlignmentSnapshotSection
        history={reviewDashboard?.history ?? []}
        savedAt={reviewDashboard?.saved?.createdAt ?? null}
      />
    </div>
  );
}

export default function AlignmentPage() {
  const { t } = useLocale();

  return (
    <Suspense fallback={<p className="text-sm text-muted">{t.common.loading}</p>}>
      <AlignmentPageContent />
    </Suspense>
  );
}
