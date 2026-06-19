"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryFilter } from "@/components/category-filter";
import { TaskCard } from "@/components/task-card";
import { SortableTaskList } from "@/components/sortable-task-list";
import { TaskStatusFilterBar } from "@/components/task-status-filter";
import { apiFetch } from "@/lib/api-client";
import { useTimer } from "@/components/timer-provider";
import { useTaskActions } from "@/lib/hooks/use-task-actions";
import { useLocale } from "@/lib/i18n/context";
import { translateFocusTrack, translatePillar } from "@/lib/i18n/entities";
import {
  filterTasksByStatus,
  sortDoneTasksByCompletedAt,
  sortTasks,
  type TaskStatusFilter,
} from "@/lib/services/task-sorting";
import {
  TaskRecurrenceForm,
  defaultRecurrenceFormValue,
} from "@/components/task-recurrence-form";
import {
  enrichTasksWithPillars,
  filterTasksByPillar,
  mergeFilteredTaskReorder,
  parseStrategyPillars,
  type PillarOption,
  type TaskRow,
} from "@/lib/tasks/enrich-tasks";

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
  recurrenceType: "none" | "daily" | "weekly";
  recurrenceDays: number[];
  recurrenceCarryOver: boolean;
  source: "openai" | "rules";
};

export default function TasksPage() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [todayTasks, setTodayTasks] = useState<TaskRow[]>([]);
  const [title, setTitle] = useState("");
  const [newTaskPillarId, setNewTaskPillarId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pillars, setPillars] = useState<PillarOption[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("active");
  const [todayOnly, setTodayOnly] = useState(false);
  const [recurrence, setRecurrence] = useState(defaultRecurrenceFormValue);
  const [recurrenceTouched, setRecurrenceTouched] = useState(false);
  const [autoClassify, setAutoClassify] = useState<ClassifyPreview | null>(null);
  const [autoEstimate, setAutoEstimate] = useState<EstimatePreview | null>(null);
  const [autoRecurrence, setAutoRecurrence] = useState<RecurrencePreview | null>(
    null,
  );
  const [analyzing, setAnalyzing] = useState(false);
  const { registerOnStop } = useTimer();

  const load = useCallback(async () => {
    try {
      setError(null);
      const [todayData, tasksData, strategyData] = await Promise.all([
        apiFetch<{ tasks: TaskRow[] }>("/api/tasks?status=today"),
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
      setTodayTasks(
        enrichTasksWithPillars(todayData.tasks, strategyPillars),
      );
      setTasks(enrichTasksWithPillars(tasksData.tasks, strategyPillars));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.loadFailed);
    }
  }, [router, t.errors.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return registerOnStop(() => {
      void load();
    });
  }, [load, registerOnStop]);

  useEffect(() => {
    if (newTaskPillarId) setAutoClassify(null);
  }, [newTaskPillarId]);

  useEffect(() => {
    const trimmed = title.trim();
    if (!trimmed || pillars.length === 0) {
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
              setRecurrence({
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
  }, [title, pillars, newTaskPillarId, recurrenceTouched]);

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

  const applyOptimisticTaskPatch = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      let snapshotTasks: TaskRow[] | null = null;
      let snapshotToday: TaskRow[] | null = null;

      setTasks((current) => {
        snapshotTasks = current;
        return current.map((task) =>
          task.id === id ? { ...task, ...patch } : task,
        );
      });
      setTodayTasks((current) => {
        snapshotToday = current;
        return current.map((task) =>
          task.id === id ? { ...task, ...patch } : task,
        );
      });

      return () => {
        if (snapshotTasks) setTasks(snapshotTasks);
        if (snapshotToday) setTodayTasks(snapshotToday);
      };
    },
    [],
  );

  const {
    recalculating,
    patchTask,
    changePillar,
    recalculatePriority,
    breakdownTask,
    applyBreakdown,
    toggleSubtask,
    updateTaskTitle,
    updateEstimatedMin,
    updateSubtaskTitle,
    addSubtask,
    deleteSubtask,
    reorderSubtasks,
    reorderTasks,
    logTime,
  } = useTaskActions({
    reload: load,
    errors: t.errors,
    onError: setError,
    applyOptimisticTaskPatch,
  });

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setError(null);
      await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          autoBreakdown: true,
          ...(newTaskPillarId ? { pillarId: newTaskPillarId } : {}),
          ...(recurrenceTouched
            ? recurrence.recurrenceType !== "none"
              ? {
                  recurrenceType: recurrence.recurrenceType,
                  recurrenceDays:
                    recurrence.recurrenceType === "weekly"
                      ? recurrence.recurrenceDays
                      : null,
                  recurrenceCarryOver: recurrence.recurrenceCarryOver,
                }
              : { recurrenceType: "none" }
            : {}),
        }),
      });
      setTitle("");
      setNewTaskPillarId("");
      setRecurrence(defaultRecurrenceFormValue);
      setRecurrenceTouched(false);
      setAutoRecurrence(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.addTaskFailed);
    }
  }

  const sourceTasks = todayOnly ? todayTasks : tasks;

  const filteredTasks = useMemo(() => {
    const byStatus = filterTasksByStatus(sourceTasks, statusFilter);
    const byPillar = filterTasksByPillar(byStatus, categoryFilter);
    if (statusFilter === "done") {
      return sortDoneTasksByCompletedAt(byPillar);
    }
    if (todayOnly) {
      return sortTasks(byPillar, "priority");
    }
    return byPillar;
  }, [sourceTasks, categoryFilter, statusFilter, todayOnly]);

  const handleReorder = useCallback(
    async (orderedIds: string[]) => {
      if (categoryFilter) {
        await reorderTasks(
          mergeFilteredTaskReorder(
            tasks.map((task) => task.id),
            filteredTasks.map((task) => task.id),
            orderedIds,
          ),
        );
        return;
      }
      await reorderTasks(orderedIds);
    },
    [categoryFilter, filteredTasks, reorderTasks, tasks],
  );

  const taskMap = new Map(filteredTasks.map((task) => [task.id, task]));
  const canReorder = statusFilter !== "done" && !todayOnly;

  const renderTaskCard = (
    task: TaskRow,
    action: "complete" | "reopen",
    rank?: number,
  ) => (
    <TaskCard
      key={task.id}
      task={task}
      rank={rank}
      pillars={pillars}
      onChangePillar={changePillar}
      onBreakdown={breakdownTask}
      onApplyBreakdown={applyBreakdown}
      onAddSubtask={addSubtask}
      onDeleteSubtask={(id) => void deleteSubtask(id)}
      onReorderSubtasks={reorderSubtasks}
      onToggleSubtask={toggleSubtask}
      onUpdateTitle={updateTaskTitle}
      onUpdateSubtaskTitle={updateSubtaskTitle}
      onUpdateEstimatedMin={updateEstimatedMin}
      onToggleIntimidating={(id, intimidating) =>
        void patchTask(id, { intimidationScore: intimidating ? 4 : 2 })
      }
      onComplete={
        action === "complete"
          ? (id) => void patchTask(id, { status: "done" })
          : undefined
      }
      onReopen={
        action === "reopen"
          ? (id) => void patchTask(id, { status: "todo" })
          : undefined
      }
      onLogTime={(id, minutes) => void logTime(id, minutes)}
      onTimerError={setError}
      onUpdateRecurrence={(id, value) =>
        void patchTask(id, {
          recurrenceType: value.recurrenceType,
          recurrenceDays:
            value.recurrenceType === "weekly" ? value.recurrenceDays : null,
          recurrenceCarryOver: value.recurrenceCarryOver,
        })
      }
    />
  );

  const emptyMessage = useMemo(() => {
    if (todayOnly) {
      if (sourceTasks.length > 0 && categoryFilter) {
        return t.today.filteredEmpty;
      }
      if (statusFilter === "done") {
        return t.completed.empty;
      }
      return t.today.empty;
    }
    if (statusFilter === "done") {
      return t.completed.empty;
    }
    return t.tasks.activeEmpty;
  }, [
    categoryFilter,
    sourceTasks.length,
    statusFilter,
    t.completed.empty,
    t.tasks.activeEmpty,
    t.today.empty,
    t.today.filteredEmpty,
    todayOnly,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">{t.tasks.title}</h2>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            disabled={recalculating}
            onClick={() => void recalculatePriority()}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            {recalculating ? t.tasks.recalculating : t.tasks.recalculatePriority}
          </button>
          <p className="text-xs text-muted">{t.tasks.hint}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void load()}
          >
            {t.common.retry}
          </button>
        </div>
      )}

      <form onSubmit={addTask} className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[12rem] flex-1 rounded-md border border-border px-3 py-2 text-sm"
            placeholder={t.tasks.placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {pillars.length > 0 && (
            <select
              className="rounded-md border border-border px-3 py-2 text-sm"
              value={newTaskPillarId}
              onChange={(e) => setNewTaskPillarId(e.target.value)}
              aria-label={t.tasks.categoryOnCreate}
            >
              <option value="">{t.tasks.autoCategory}</option>
              {pillars.map((p) => (
                <option key={p.id} value={p.id}>
                  {translatePillar(p.name, locale)}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm text-white"
          >
            {t.common.add}
          </button>
        </div>
        <TaskRecurrenceForm
          value={recurrence}
          onChange={(value) => {
            setRecurrenceTouched(true);
            setRecurrence(value);
          }}
          leadingButton={
            <button
              type="button"
              onClick={() => setTodayOnly((value) => !value)}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                todayOnly
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:bg-neutral-50"
              }`}
            >
              {t.today.title}
            </button>
          }
        />
        {title.trim() && (
          <p className="text-xs text-muted">
            {analyzing ? (
              t.tasks.analyzing
            ) : (
              <>
                {newTaskPillarId ? (
                  <>
                    {t.tasks.manualOverride}：
                    {translatePillar(
                      pillars.find((p) => p.id === newTaskPillarId)?.name ?? "",
                      locale,
                    )}
                  </>
                ) : autoLabel ? (
                  <>
                    {t.tasks.autoDetected}：{autoLabel}
                    {autoClassify?.source === "openai"
                      ? ` · ${t.tasks.classifySourceAi}`
                      : autoClassify?.source === "rules"
                        ? ` · ${t.tasks.classifySourceRules}`
                        : null}
                  </>
                ) : (
                  t.taskCard.uncategorized
                )}
                {recurrenceLabel && <> · {recurrenceLabel}</>}
                {estimateLabel && <> · {estimateLabel}</>}
              </>
            )}
          </p>
        )}
      </form>

      <CategoryFilter
        pillars={pillars}
        selectedPillarId={categoryFilter}
        onChange={setCategoryFilter}
      />

      <TaskStatusFilterBar value={statusFilter} onChange={setStatusFilter} />

      {filteredTasks.length === 0 ? (
        <p className="text-sm text-muted">{emptyMessage}</p>
      ) : canReorder ? (
        <SortableTaskList
          taskIds={filteredTasks.map((task) => task.id)}
          onReorder={handleReorder}
        >
          {(taskId) => {
            const task = taskMap.get(taskId);
            if (!task) return null;
            return renderTaskCard(task, "complete");
          }}
        </SortableTaskList>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task, i) =>
            renderTaskCard(
              task,
              statusFilter === "done" ? "reopen" : "complete",
              todayOnly && statusFilter !== "done" ? i + 1 : undefined,
            ),
          )}
        </div>
      )}
    </div>
  );
}
