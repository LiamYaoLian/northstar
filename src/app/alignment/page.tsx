"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlignmentCompletionLog } from "@/components/alignment/alignment-completion-log";
import { AlignmentKpiCards } from "@/components/alignment/alignment-kpi-cards";
import { AlignmentPillarSection } from "@/components/alignment/alignment-pillar-section";
import { AlignmentProcrastinationSection } from "@/components/alignment/alignment-procrastination-section";
import { AlignmentSnapshotSection } from "@/components/alignment/alignment-snapshot-section";
import { AlignmentWorkTracksSection } from "@/components/alignment/alignment-work-tracks-section";
import { apiFetch } from "@/lib/api-client";
import { useLocale } from "@/lib/i18n/context";
import type {
  AlignmentResult,
  FocusTrackAlignment,
  ProcrastinationSignal,
} from "@/lib/alignment";
import type { AlignmentPeriod } from "@/lib/review/period";
import { reviewPeriodFromAlignment } from "@/lib/review/period";
import type { TaskCompletionEvent } from "@/lib/tasks/completion-events";
import { parseStrategyPillars, type PillarOption } from "@/lib/tasks/enrich-tasks";
import { clientTimezone } from "@/lib/tasks/timezone";
import { cn } from "@/lib/utils";

type ReviewSnapshotView = {
  id: string;
  periodStart: string;
  periodEnd: string;
  alignmentScore: number;
  driftScore: number;
  createdAt: string;
};

type ReviewDashboard = {
  saved: ReviewSnapshotView | null;
  history: ReviewSnapshotView[];
};

function AlignmentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  const period = (searchParams.get("period") as AlignmentPeriod | null) ?? "week";

  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);
  const [driftScore, setDriftScore] = useState(0);
  const [workTracks, setWorkTracks] = useState<FocusTrackAlignment[]>([]);
  const [procrastination, setProcrastination] = useState<ProcrastinationSignal[]>([]);
  const [events, setEvents] = useState<TaskCompletionEvent[]>([]);
  const [pillars, setPillars] = useState<PillarOption[]>([]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [reviewDashboard, setReviewDashboard] = useState<ReviewDashboard | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reviewPeriod = reviewPeriodFromAlignment(period);

  const setPeriod = useCallback(
    (next: AlignmentPeriod) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", next);
      router.replace(`/alignment?${params.toString()}`);
    },
    [router, searchParams],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const pillarQuery =
        categoryFilter != null ? `&pillarId=${encodeURIComponent(categoryFilter)}` : "";

      const alignmentData = await apiFetch<{
        alignment: AlignmentResult | null;
        workTracks: FocusTrackAlignment[];
        procrastination: ProcrastinationSignal[];
        periodStart: string;
        periodEnd: string;
        driftScore: number;
      }>(`/api/alignment?period=${period}`);

      if (!alignmentData.alignment) {
        router.replace("/onboarding");
        return;
      }

      const since = alignmentData.periodStart;
      const until = alignmentData.periodEnd;

      const [completionsData, strategyData, reviewData] = await Promise.all([
        apiFetch<{ events: TaskCompletionEvent[] }>(
          `/api/completions?since=${since}&until=${until}${pillarQuery}`,
        ),
        apiFetch<{
          strategy: {
            pillars: {
              id: string;
              name: string;
              color: string;
              focusTracks: string | null;
            }[];
          } | null;
        }>("/api/strategy"),
        reviewPeriod
          ? apiFetch<ReviewDashboard>(`/api/reviews?period=${reviewPeriod}`)
          : Promise.resolve(null),
      ]);

      setAlignment(alignmentData.alignment);
      setDriftScore(alignmentData.driftScore);
      setWorkTracks(alignmentData.workTracks ?? []);
      setProcrastination(alignmentData.procrastination ?? []);
      setPeriodStart(since);
      setPeriodEnd(until);
      setEvents(completionsData.events);
      setPillars(parseStrategyPillars(strategyData.strategy?.pillars ?? []));
      setReviewDashboard(reviewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [period, categoryFilter, reviewPeriod, router, t.errors.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const timeExportHref = useMemo(() => {
    if (!periodStart || !periodEnd) return null;
    const tz = clientTimezone();
    return `/api/time-entries/export?since=${periodStart}&until=${periodEnd}&tz=${encodeURIComponent(tz)}`;
  }, [periodStart, periodEnd]);

  const completionExportHref = useMemo(() => {
    if (!periodStart || !periodEnd) return null;
    const tz = clientTimezone();
    const pillarQuery =
      categoryFilter != null
        ? `&pillarId=${encodeURIComponent(categoryFilter)}`
        : "";
    return `/api/completions/export?since=${periodStart}&until=${periodEnd}${pillarQuery}&tz=${encodeURIComponent(tz)}`;
  }, [periodStart, periodEnd, categoryFilter]);

  const periodOptions: { id: AlignmentPeriod; label: string }[] = [
    { id: "today", label: t.completed.today },
    { id: "week", label: t.completed.thisWeek },
    { id: "month", label: t.review.thisMonth },
    { id: "all", label: t.completed.all },
  ];

  async function saveSnapshot() {
    if (!reviewPeriod) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: reviewPeriod }),
      });
      setMessage(t.review.saved);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.review.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !alignment) {
    return <p className="text-sm text-muted">{t.common.loading}</p>;
  }

  if (error && !alignment) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-800">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
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
      <div className="sticky top-0 z-10 -mx-1 space-y-3 border-b border-border bg-background/95 px-1 pb-3 pt-1 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{t.alignment.title}</h2>
            <p className="text-sm text-muted">{t.alignment.subtitle}</p>
            {periodStart && periodEnd && (
              <p className="text-xs text-muted">
                {periodStart} – {periodEnd}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {reviewPeriod && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveSnapshot()}
                className="rounded-md bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {saving ? t.review.saving : t.review.saveSnapshot}
              </button>
            )}
            {timeExportHref && (
              <a
                href={timeExportHref}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                {t.alignment.exportTimeCsv}
              </a>
            )}
            {completionExportHref && (
              <a
                href={completionExportHref}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                {t.completed.exportCsv}
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPeriod(option.id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                period === option.id
                  ? "border-accent bg-accent text-white"
                  : "border-border text-muted hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

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
