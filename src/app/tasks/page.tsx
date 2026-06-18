"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryFilter } from "@/components/category-filter";
import { TaskCard } from "@/components/task-card";
import { SortableTaskList } from "@/components/sortable-task-list";
import { apiFetch } from "@/lib/api-client";
import { useTaskActions } from "@/lib/hooks/use-task-actions";
import { useLocale } from "@/lib/i18n/context";
import { translateFocusTrack, translatePillar } from "@/lib/i18n/entities";
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

export default function TasksPage() {
  const { locale, t } = useLocale();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [title, setTitle] = useState("");
  const [newTaskPillarId, setNewTaskPillarId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pillars, setPillars] = useState<PillarOption[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [autoClassify, setAutoClassify] = useState<ClassifyPreview | null>(null);
  const [classifying, setClassifying] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [tasksData, strategyData] = await Promise.all([
        apiFetch<{ tasks: TaskRow[] }>("/api/tasks?sort=manual"),
        apiFetch<{ strategy: { pillars: { id: string; name: string; color: string; focusTracks: string | null }[] } | null }>(
          "/api/strategy",
        ),
      ]);
      const strategyPillars = parseStrategyPillars(
        strategyData.strategy?.pillars ?? [],
      );
      setPillars(strategyPillars);
      setTasks(enrichTasksWithPillars(tasksData.tasks, strategyPillars));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.loadFailed);
    }
  }, [t.errors.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const trimmed = title.trim();
    if (!trimmed || pillars.length === 0 || newTaskPillarId) {
      setAutoClassify(null);
      setClassifying(false);
      return;
    }

    setClassifying(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const data = await apiFetch<{ classification: ClassifyPreview }>(
            "/api/tasks/classify",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: trimmed }),
            },
          );
          if (!cancelled) setAutoClassify(data.classification);
        } catch {
          if (!cancelled) setAutoClassify(null);
        } finally {
          if (!cancelled) setClassifying(false);
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [title, pillars, newTaskPillarId]);

  const autoLabel = useMemo(() => {
    if (!autoClassify?.pillarName) return null;
    const pillar = translatePillar(autoClassify.pillarName, locale);
    if (autoClassify.focusTrack) {
      return `${pillar} · ${translateFocusTrack(autoClassify.focusTrack, locale)}`;
    }
    return pillar;
  }, [autoClassify, locale]);

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
    reorderTasks,
    logTime,
  } = useTaskActions({
    reload: load,
    errors: t.errors,
    onError: setError,
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
        }),
      });
      setTitle("");
      setNewTaskPillarId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.addTaskFailed);
    }
  }

  const filteredTasks = useMemo(
    () => filterTasksByPillar(tasks, categoryFilter),
    [tasks, categoryFilter],
  );

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
        {title.trim() && (
          <p className="text-xs text-muted">
            {newTaskPillarId ? (
              <>
                {t.tasks.manualOverride}：
                {translatePillar(
                  pillars.find((p) => p.id === newTaskPillarId)?.name ?? "",
                  locale,
                )}
              </>
            ) : classifying ? (
              t.tasks.classifying
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
          </p>
        )}
      </form>

      <CategoryFilter
        pillars={pillars}
        selectedPillarId={categoryFilter}
        onChange={setCategoryFilter}
      />

      <SortableTaskList
        taskIds={filteredTasks.map((task) => task.id)}
        onReorder={handleReorder}
      >
        {(taskId) => {
          const task = taskMap.get(taskId);
          if (!task) return null;
          return (
            <TaskCard
              task={task}
              pillars={pillars}
              onChangePillar={changePillar}
              onBreakdown={breakdownTask}
              onApplyBreakdown={applyBreakdown}
              onAddSubtask={addSubtask}
              onDeleteSubtask={(id) => void deleteSubtask(id)}
              onReorderSubtasks={reorderSubtasks}
              onToggleSubtask={toggleSubtask}
              onUpdateSubtaskTitle={updateSubtaskTitle}
              onToggleIntimidating={(id, intimidating) =>
                void patchTask(id, { intimidationScore: intimidating ? 4 : 2 })
              }
              onComplete={(id) => void patchTask(id, { status: "done" })}
              onLogTime={(id, minutes) => void logTime(id, minutes)}
            />
          );
        }}
      </SortableTaskList>
    </div>
  );
}
