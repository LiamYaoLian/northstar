"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useLocale } from "@/lib/i18n/context";
import { translateFocusTrack, translatePillar } from "@/lib/i18n/entities";
import type { PillarOption } from "@/lib/tasks/enrich-tasks";
import type { RecurrenceFormValue } from "@/components/task-recurrence-form";

type ClassifyPreview = {
  pillarName: string | null;
  focusTrack: string | null;
  source: "openai" | "rules";
};

type EstimatePreview = {
  estimatedMin: number | null;
  source: "openai" | "rules";
};

type RecurrencePreview = {
  recurrenceType: RecurrenceFormValue["recurrenceType"];
  recurrenceDays: number[];
  recurrenceCarryOver: boolean;
  source: "openai" | "rules";
};

type UseTaskTitleAnalysisOptions = {
  title: string;
  pillars: PillarOption[];
  newTaskPillarId: string;
  recurrenceTouched: boolean;
  sessionStatus: string;
  onAutoRecurrence: (value: RecurrenceFormValue) => void;
};

export function useTaskTitleAnalysis({
  title,
  pillars,
  newTaskPillarId,
  recurrenceTouched,
  sessionStatus,
  onAutoRecurrence,
}: UseTaskTitleAnalysisOptions) {
  const { locale, t } = useLocale();
  const [autoClassify, setAutoClassify] = useState<ClassifyPreview | null>(null);
  const [autoEstimate, setAutoEstimate] = useState<EstimatePreview | null>(null);
  const [autoRecurrence, setAutoRecurrence] = useState<RecurrencePreview | null>(
    null,
  );
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (newTaskPillarId) setAutoClassify(null);
  }, [newTaskPillarId]);

  useEffect(() => {
    const trimmed = title.trim();
    if (!trimmed || pillars.length === 0 || sessionStatus !== "authenticated") {
      setAutoClassify(null);
      setAutoEstimate(null);
      setAutoRecurrence(null);
      setAnalyzing(false);
      return;
    }

    setAnalyzing(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const data = await apiFetch<{
            classification: ClassifyPreview;
            estimate: EstimatePreview;
            recurrence: RecurrencePreview;
          }>("/api/tasks/classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: trimmed }),
          });
          if (!cancelled) {
            setAutoEstimate(data.estimate);
            setAutoRecurrence(data.recurrence);
            if (!newTaskPillarId) setAutoClassify(data.classification);
            if (!recurrenceTouched) {
              onAutoRecurrence({
                recurrenceType: data.recurrence.recurrenceType,
                recurrenceDays: data.recurrence.recurrenceDays,
                recurrenceCarryOver: data.recurrence.recurrenceCarryOver,
              });
            }
          }
        } catch {
          if (!cancelled) {
            setAutoClassify(null);
            setAutoEstimate(null);
            setAutoRecurrence(null);
          }
        } finally {
          if (!cancelled) setAnalyzing(false);
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    title,
    pillars,
    newTaskPillarId,
    recurrenceTouched,
    sessionStatus,
    onAutoRecurrence,
  ]);

  const autoLabel = useMemo(() => {
    if (!autoClassify?.pillarName) return null;
    const pillar = translatePillar(autoClassify.pillarName, locale);
    if (autoClassify.focusTrack) {
      return `${pillar} · ${translateFocusTrack(autoClassify.focusTrack, locale)}`;
    }
    return pillar;
  }, [autoClassify, locale]);

  const recurrenceLabel = useMemo(() => {
    if (!autoRecurrence || recurrenceTouched) return null;
    const typeLabel = t.recurrence[autoRecurrence.recurrenceType];
    const source =
      autoRecurrence.source === "openai"
        ? t.tasks.classifySourceAi
        : t.tasks.classifySourceRules;
    return `${typeLabel} · ${source}`;
  }, [
    autoRecurrence,
    recurrenceTouched,
    t.recurrence,
    t.tasks.classifySourceAi,
    t.tasks.classifySourceRules,
  ]);

  const estimateLabel = useMemo(() => {
    if (autoEstimate?.estimatedMin == null) return null;
    const source =
      autoEstimate.source === "openai"
        ? t.tasks.classifySourceAi
        : autoEstimate.source === "rules"
          ? t.tasks.classifySourceRules
          : null;
    return source
      ? `${t.tasks.autoEstimated} ${autoEstimate.estimatedMin}min · ${source}`
      : `${t.tasks.autoEstimated} ${autoEstimate.estimatedMin}min`;
  }, [
    autoEstimate,
    t.tasks.autoEstimated,
    t.tasks.classifySourceAi,
    t.tasks.classifySourceRules,
  ]);

  return {
    autoClassify,
    autoRecurrence,
    analyzing,
    autoLabel,
    recurrenceLabel,
    estimateLabel,
    clearAutoRecurrence: () => setAutoRecurrence(null),
  };
}
