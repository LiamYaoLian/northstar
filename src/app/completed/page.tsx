"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CategoryFilter } from "@/components/category-filter";
import { CompletionListItem } from "@/components/completion-list-item";
import { apiFetch } from "@/lib/api-client";
import { useLocale } from "@/lib/i18n/context";
import { localeTag } from "@/lib/i18n/entities";
import {
  groupCompletionEventsByDate,
  type TaskCompletionEvent,
} from "@/lib/tasks/completion-events";
import {
  completionQueryForPageRange,
  type CompletionDateRange,
} from "@/lib/tasks/completion-ranges";
import { clientTimezone } from "@/lib/tasks/timezone";
import {
  parseStrategyPillars,
  type PillarOption,
} from "@/lib/tasks/enrich-tasks";
import { cn } from "@/lib/utils";

type RangeKey = "today" | "week" | "all";

const ALL_TIME_RANGE: CompletionDateRange = {
  since: "2000-01-01",
  until: "2099-12-31",
};

function CompletedPageContent() {
  const searchParams = useSearchParams();
  const { locale, t } = useLocale();
  const [events, setEvents] = useState<TaskCompletionEvent[]>([]);
  const [pillars, setPillars] = useState<PillarOption[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = (searchParams.get("range") as RangeKey | null) ?? "week";

  const load = useCallback(async () => {
    try {
      setError(null);
      const tz = clientTimezone();
      const now = new Date();
      const query =
        completionQueryForPageRange(range, tz, now) ??
        ALL_TIME_RANGE;
      const pillarQuery =
        categoryFilter != null ? `&pillarId=${encodeURIComponent(categoryFilter)}` : "";
      const [eventsData, strategyData] = await Promise.all([
        apiFetch<{ events: TaskCompletionEvent[] }>(
          `/api/completions?since=${query.since}&until=${query.until}${pillarQuery}`,
        ),
        apiFetch<{ strategy: { pillars: { id: string; name: string; color: string; focusTracks: string | null }[] } | null }>(
          "/api/strategy",
        ),
      ]);
      setEvents(eventsData.events);
      setPillars(parseStrategyPillars(strategyData.strategy?.pillars ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.loadFailed);
    }
  }, [range, categoryFilter, t.errors.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => groupCompletionEventsByDate(events), [events]);

  const rangeOptions: { id: RangeKey; label: string; href: string }[] = [
    { id: "today", label: t.completed.today, href: "/completed?range=today" },
    { id: "week", label: t.completed.thisWeek, href: "/completed?range=week" },
    { id: "all", label: t.completed.all, href: "/completed?range=all" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t.completed.title}</h2>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {rangeOptions.map((option) => (
          <a
            key={option.id}
            href={option.href}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              range === option.id
                ? "border-accent bg-accent text-white"
                : "border-border text-muted hover:text-foreground",
            )}
          >
            {option.label}
          </a>
        ))}
      </div>

      <CategoryFilter
        pillars={pillars}
        selectedPillarId={categoryFilter}
        onChange={setCategoryFilter}
      />

      {groups.length === 0 ? (
        <p className="text-sm text-muted">{t.completed.empty}</p>
      ) : (
        groups.map((group) => (
          <section key={group.date} className="space-y-2">
            <h3 className="text-sm font-medium text-muted">
              {t.completed.groupDate.replace(
                "{date}",
                new Date(`${group.date}T12:00:00`).toLocaleDateString(
                  localeTag(locale),
                  { weekday: "short", month: "short", day: "numeric" },
                ),
              )}
            </h3>
            <div className="space-y-2">
              {group.events.map((event) => (
                <CompletionListItem key={event.id} event={event} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export default function CompletedPage() {
  const { t } = useLocale();

  return (
    <Suspense fallback={<p className="text-sm text-muted">{t.common.loading}</p>}>
      <CompletedPageContent />
    </Suspense>
  );
}
