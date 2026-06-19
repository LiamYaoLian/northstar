"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import { apiFetch } from "@/lib/api-client";
import { useTaskActions } from "@/lib/hooks/use-task-actions";
import { useLocale } from "@/lib/i18n/context";
import {
  enrichTasksWithPillars,
  filterTasksByPillar,
  parseStrategyPillars,
  type PillarOption,
  type TaskRow,
} from "@/lib/tasks/enrich-tasks";
import {
  parseCalendarUrlState,
  type CalendarView,
} from "@/lib/tasks/calendar";
import { clientTimezone, localDateString } from "@/lib/tasks/timezone";

function CalendarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const tz = clientTimezone();

  const urlState = parseCalendarUrlState(searchParams, tz);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [pillars, setPillars] = useState<PillarOption[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [tasksData, strategyData] = await Promise.all([
        apiFetch<{ tasks: TaskRow[] }>("/api/tasks?sort=manual"),
        apiFetch<{
          hasStrategy: boolean;
          strategy: {
            pillars: {
              id: string;
              name: string;
              color: string;
              focusTracks: string | null;
            }[];
          } | null;
        }>("/api/strategy"),
      ]);

      if (!strategyData.hasStrategy) {
        router.replace("/onboarding");
        return;
      }

      const strategyPillars = parseStrategyPillars(
        strategyData.strategy?.pillars ?? [],
      );
      setPillars(strategyPillars);
      setTasks(enrichTasksWithPillars(tasksData.tasks, strategyPillars));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [router, t.errors.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyOptimisticTaskPatch = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      let snapshot: TaskRow[] | null = null;
      setTasks((current) => {
        snapshot = current;
        return current.map((task) =>
          task.id === id ? { ...task, ...patch } : task,
        );
      });
      return () => {
        if (snapshot) setTasks(snapshot);
      };
    },
    [],
  );

  const { updateTaskDates } = useTaskActions({
    reload: load,
    errors: t.errors,
    onError: setError,
    pillars,
    applyOptimisticTaskPatch,
  });

  const visibleTasks = useMemo(() => {
    const active = tasks.filter((task) => task.status !== "done");
    return filterTasksByPillar(active, categoryFilter);
  }, [tasks, categoryFilter]);

  const replaceCalendarUrl = useCallback(
    (nextView: CalendarView, nextAnchor: Date) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", nextView);
      params.set("date", localDateString(nextAnchor, tz));
      router.replace(`/calendar?${params.toString()}`);
    },
    [router, searchParams, tz],
  );

  async function handleAddUnscheduledTask(title: string) {
    try {
      setAddingTask(true);
      setError(null);
      await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startAt: null,
          autoBreakdown: false,
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.addTaskFailed);
    } finally {
      setAddingTask(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">{t.common.loading}</p>;
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="underline"
          >
            {t.common.retry}
          </button>
        </div>
      ) : null}

      <CalendarBoard
        tasks={visibleTasks}
        pillars={pillars}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        view={urlState.view}
        anchor={urlState.anchor}
        onViewChange={(nextView) => replaceCalendarUrl(nextView, urlState.anchor)}
        onAnchorChange={(nextAnchor) =>
          replaceCalendarUrl(urlState.view, nextAnchor)
        }
        onScheduleTask={(taskId, startAt) => {
          updateTaskDates(taskId, { startAt });
        }}
        onAddUnscheduledTask={handleAddUnscheduledTask}
        addingTask={addingTask}
      />
    </div>
  );
}

export default function CalendarPage() {
  const { t } = useLocale();

  return (
    <Suspense fallback={<p className="text-sm text-muted">{t.common.loading}</p>}>
      <CalendarPageContent />
    </Suspense>
  );
}
