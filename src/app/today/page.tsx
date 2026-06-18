"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryFilter } from "@/components/category-filter";
import { CompletionListItem } from "@/components/completion-list-item";
import { TaskCard } from "@/components/task-card";
import { apiFetch } from "@/lib/api-client";
import { useTaskActions } from "@/lib/hooks/use-task-actions";
import { useLocale } from "@/lib/i18n/context";
import { localeTag } from "@/lib/i18n/entities";
import {
  enrichTasksWithPillars,
  filterTasksByPillar,
  parseStrategyPillars,
  type PillarOption,
  type TaskRow,
} from "@/lib/tasks/enrich-tasks";
import { rankAndLimit } from "@/lib/services/task-sorting";
import { completionQueryForToday } from "@/lib/tasks/completion-ranges";
import type { TaskCompletionEvent } from "@/lib/tasks/completion-events";
import { clientTimezone } from "@/lib/tasks/timezone";

export default function TodayPage() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [allTasks, setAllTasks] = useState<TaskRow[]>([]);
  const [pillars, setPillars] = useState<PillarOption[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [completedEvents, setCompletedEvents] = useState<TaskCompletionEvent[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const tz = clientTimezone();
      const todayQuery = completionQueryForToday(tz, new Date());
      const [tasksData, strategyData, completionsData] = await Promise.all([
        apiFetch<{ tasks: TaskRow[] }>("/api/tasks/today"),
        apiFetch<{ hasStrategy: boolean; strategy: { pillars: { id: string; name: string; color: string; focusTracks: string | null }[] } | null }>(
          "/api/strategy",
        ),
        apiFetch<{ events: TaskCompletionEvent[] }>(
          `/api/completions?since=${todayQuery.since}&until=${todayQuery.until}`,
        ),
      ]);

      if (!strategyData.hasStrategy) {
        router.replace("/onboarding");
        return;
      }

      const strategyPillars = parseStrategyPillars(
        strategyData.strategy?.pillars ?? [],
      );
      setPillars(strategyPillars);

      const enriched = enrichTasksWithPillars(tasksData.tasks, strategyPillars);
      setAllTasks(enriched);
      setCompletedEvents(completionsData.events);
      setUpdatedAt(
        enriched[0]?.priorityComputedAt
          ? new Date(enriched[0].priorityComputedAt).toLocaleTimeString(
              localeTag(locale),
              { hour: "2-digit", minute: "2-digit" },
            )
          : "—",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.loadFailed);
    }
  }, [router, locale, t.errors.loadFailed]);

  const tasks = useMemo(() => {
    const filtered = filterTasksByPillar(allTasks, categoryFilter);
    return rankAndLimit(filtered, 5);
  }, [allTasks, categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const {
    recalculating,
    patchTask,
    changePillar,
    recalculatePriority,
    breakdownTask,
    applyBreakdown,
    toggleSubtask,
    updateSubtaskTitle,
    addSubtask,
    deleteSubtask,
    reorderSubtasks,
    logTime,
  } = useTaskActions({
    reload: load,
    errors: { ...t.errors, updateTaskFailed: t.errors.updateFailed },
    onError: setError,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{t.today.title}</h2>
          <p className="text-sm text-muted">
            {t.today.subtitle} {updatedAt}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            disabled={recalculating}
            onClick={() => void recalculatePriority()}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            {recalculating ? t.today.recalculating : t.today.recalculatePriority}
          </button>
          <p className="text-xs text-muted">{t.tasks.hint}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <CategoryFilter
        pillars={pillars}
        selectedPillarId={categoryFilter}
        onChange={setCategoryFilter}
      />

      {tasks.length === 0 ? (
        <p className="text-sm text-muted">
          {t.today.empty}{" "}
          <Link href="/tasks" className="text-accent">
            {t.nav.tasks}
          </Link>
          .
        </p>
      ) : (
        tasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            rank={i + 1}
            pillars={pillars}
            onChangePillar={changePillar}
            onBreakdown={breakdownTask}
            onApplyBreakdown={applyBreakdown}
            onAddSubtask={addSubtask}
            onDeleteSubtask={(id) => void deleteSubtask(id)}
            onReorderSubtasks={reorderSubtasks}
            onToggleSubtask={toggleSubtask}
            onUpdateSubtaskTitle={updateSubtaskTitle}
            onUpdateEstimatedMin={(id, minutes) =>
              void patchTask(id, { estimatedMin: minutes })
            }
            onToggleIntimidating={(id, intimidating) =>
              void patchTask(id, { intimidationScore: intimidating ? 4 : 2 })
            }
            onComplete={(id) => void patchTask(id, { status: "done" })}
            onLogTime={(id, minutes) => void logTime(id, minutes)}
            onUpdateRecurrence={(id, value) =>
              void patchTask(id, {
                recurrenceType: value.recurrenceType,
                recurrenceDays:
                  value.recurrenceType === "weekly"
                    ? value.recurrenceDays
                    : null,
                recurrenceCarryOver: value.recurrenceCarryOver,
              })
            }
          />
        ))
      )}

      {completedEvents.length > 0 && (
        <section className="space-y-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium"
          >
            <span>
              {t.today.completedToday} · {completedEvents.length}
            </span>
            <span className="text-muted">{showCompleted ? "−" : "+"}</span>
          </button>
          {showCompleted && (
            <div className="space-y-2">
              {completedEvents.map((event) => (
                <CompletionListItem key={event.id} event={event} />
              ))}
              <Link href="/completed?range=today" className="text-sm text-accent">
                {t.today.viewAll}
              </Link>
            </div>
          )}
        </section>
      )}

      <Link href="/tasks" className="text-sm text-accent">
        {t.today.viewAll}
      </Link>
    </div>
  );
}
