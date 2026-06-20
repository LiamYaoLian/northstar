"use client";

import { useLocale } from "@/lib/i18n/context";
import type { AlignmentPeriod } from "@/lib/review/period";
import { cn } from "@/lib/utils";

import type { ReviewPeriod } from "@/lib/review/period";

type AlignmentPageToolbarProps = {
  period: AlignmentPeriod;
  periodStart: string;
  periodEnd: string;
  saving: boolean;
  reviewPeriod: ReviewPeriod | null;
  timeExportHref: string | null;
  completionExportHref: string | null;
  onPeriodChange: (period: AlignmentPeriod) => void;
  onSaveSnapshot: () => void;
};

export function AlignmentPageToolbar({
  period,
  periodStart,
  periodEnd,
  saving,
  reviewPeriod,
  timeExportHref,
  completionExportHref,
  onPeriodChange,
  onSaveSnapshot,
}: AlignmentPageToolbarProps) {
  const { t } = useLocale();

  const periodOptions: { id: AlignmentPeriod; label: string }[] = [
    { id: "today", label: t.completed.today },
    { id: "week", label: t.completed.thisWeek },
    { id: "month", label: t.review.thisMonth },
    { id: "all", label: t.completed.all },
  ];

  return (
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
              onClick={onSaveSnapshot}
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
            onClick={() => onPeriodChange(option.id)}
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
  );
}
