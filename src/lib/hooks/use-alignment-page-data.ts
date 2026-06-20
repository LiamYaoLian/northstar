"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type {
  AlignmentApiResponse,
  ReviewDashboard,
  StrategyPillarsResponse,
} from "@/lib/alignment/page-types";
import type {
  AlignmentResult,
  FocusTrackAlignment,
  ProcrastinationSignal,
} from "@/lib/alignment";
import { useLocale } from "@/lib/i18n/context";
import type { AlignmentPeriod } from "@/lib/review/period";
import { reviewPeriodFromAlignment } from "@/lib/review/period";
import type { TaskCompletionEvent } from "@/lib/tasks/completion-events";
import { parseStrategyPillars, type PillarOption } from "@/lib/tasks/enrich-tasks";
import { clientTimezone } from "@/lib/tasks/timezone";

export function useAlignmentPageData(
  period: AlignmentPeriod,
  categoryFilter: string | null,
) {
  const router = useRouter();
  const { t } = useLocale();
  const reviewPeriod = reviewPeriodFromAlignment(period);

  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);
  const [driftScore, setDriftScore] = useState(0);
  const [workTracks, setWorkTracks] = useState<FocusTrackAlignment[]>([]);
  const [procrastination, setProcrastination] = useState<ProcrastinationSignal[]>([]);
  const [events, setEvents] = useState<TaskCompletionEvent[]>([]);
  const [pillars, setPillars] = useState<PillarOption[]>([]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [reviewDashboard, setReviewDashboard] = useState<ReviewDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const pillarQuery =
        categoryFilter != null ? `&pillarId=${encodeURIComponent(categoryFilter)}` : "";

      const alignmentData = await apiFetch<AlignmentApiResponse>(
        `/api/alignment?period=${period}`,
      );

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
        apiFetch<StrategyPillarsResponse>("/api/strategy"),
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

  const saveSnapshot = useCallback(async () => {
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
  }, [load, reviewPeriod, t.review.saveFailed, t.review.saved]);

  return {
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
    reload: load,
    saveSnapshot,
  };
}
