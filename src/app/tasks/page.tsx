"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CategoryFilter } from "@/components/category-filter";
import { ProjectFilter } from "@/components/project-filter";
import { ProjectSelectWithCreate } from "@/components/project-select-with-create";
import { TaskCard } from "@/components/task-card";
import { TaskStatusFilterBar } from "@/components/task-status-filter";
import { apiFetch } from "@/lib/api-client";
import { useTimer } from "@/components/timer-provider";
import { useTaskActions } from "@/lib/hooks/use-task-actions";
import { useLocale } from "@/lib/i18n/context";
import { translateFocusTrack, translatePillar } from "@/lib/i18n/entities";
import {
  filterTasksByStatus,
  sortDoneTasksByCompletedAt,
  sortTasksByTime,
  type TaskStatusFilter,
} from "@/lib/services/task-sorting";
import {
  TaskRecurrenceForm,
  defaultRecurrenceFormValue,
} from "@/components/task-recurrence-form";
import { findWorkPillar, WORK_PILLAR_NAME } from "@/lib/pillars";
import {
  enrichTasksWithPillars,
  enrichTasksWithProjects,
  filterTasksByPillar,
  filterTasksByProject,
  parseStrategyPillars,
  toProjectOptions,
  type PillarOption,
  type ProjectOption,
  type TaskRow,
} from "@/lib/tasks/enrich-tasks";
import { recurrenceTypeUsesDays } from "@/lib/tasks/recurrence-types";
import {
  defaultTaskStartAtInputValue,
  isValidTaskDateRange,
  normalizeTaskDate,
  resolveTaskStartAt,
} from "@/lib/tasks/task-dates";
import { clientTimezone } from "@/lib/tasks/timezone";

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
  recurrenceType: "none" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  recurrenceDays: number[];
  recurrenceCarryOver: boolean;
  source: "openai" | "rules";
};

export default function TasksPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const { locale, t } = useLocale();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [todayTasks, setTodayTasks] = useState<TaskRow[]>([]);
  const [title, setTitle] = useState("");
  const [newTaskPillarId, setNewTaskPillarId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pillars, setPillars] = useState<PillarOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("active");
  const [todayOnly, setTodayOnly] = useState(false);
  const [newTaskStartAt, setNewTaskStartAt] = useState(() =>
    defaultTaskStartAtInputValue(clientTimezone()),
  );
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
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
      const [todayData, tasksData, strategyData, projectsData] = await Promise.all([
        apiFetch<{ tasks: TaskRow[] }>("/api/tasks?status=today"),
        apiFetch<{ tasks: TaskRow[] }>("/api/tasks"),
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
        apiFetch<{
          projects: Array<{
            id: string;
            name: string;
            pillarId: string;
            focusTrack: string | null;
          }>;
        }>("/api/projects"),
      ]);
      if (!strategyData.hasStrategy) {
        router.replace("/onboarding");
        return;
      }

      const strategyPillars = parseStrategyPillars(
        strategyData.strategy?.pillars ?? [],
      );
      const projectOptions = toProjectOptions(projectsData.projects);
      setPillars(strategyPillars);
      setProjects(projectOptions);
      const enrich = (list: TaskRow[]) =>
        enrichTasksWithProjects(
          enrichTasksWithPillars(list, strategyPillars),
          projectOptions,
        );
      setTodayTasks(enrich(todayData.tasks));
      setTasks(enrich(tasksData.tasks));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.loadFailed);
    }
  }, [router, t.errors.loadFailed]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    void load();
  }, [load, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    return registerOnStop(() => {
      void load();
    });
  }, [load, registerOnStop, sessionStatus]);

  useEffect(() => {
    if (newTaskPillarId) setAutoClassify(null);
  }, [newTaskPillarId]);

  useEffect(() => {
    if (newTaskPillarId) return;
    if (autoClassify?.pillarName !== WORK_PILLAR_NAME) {
      setNewTaskProjectId("");
    }
  }, [autoClassify, newTaskPillarId]);


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
  }, [title, pillars, newTaskPillarId, recurrenceTouched, sessionStatus]);

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

  const applyOptimisticSubtaskPatch = useCallback(
    (subtaskId: string, patch: Record<string, unknown>) => {
      let snapshotTasks: TaskRow[] | null = null;
      let snapshotToday: TaskRow[] | null = null;

      const updateTaskSubtask = (task: TaskRow): TaskRow => {
        const subtasks = task.subtasks;
        if (!subtasks?.some((subtask) => subtask.id === subtaskId)) return task;
        return {
          ...task,
          subtasks: subtasks.map((subtask) =>
            subtask.id === subtaskId ? { ...subtask, ...patch } : subtask,
          ),
        };
      };

      setTasks((current) => {
        snapshotTasks = current;
        return current.map(updateTaskSubtask);
      });
      setTodayTasks((current) => {
        snapshotToday = current;
        return current.map(updateTaskSubtask);
      });

      return () => {
        if (snapshotTasks) setTasks(snapshotTasks);
        if (snapshotToday) setTodayTasks(snapshotToday);
      };
    },
    [],
  );

  const workPillar = useMemo(() => findWorkPillar(pillars), [pillars]);
  const showProjectFilters =
    Boolean(workPillar) && categoryFilter === workPillar?.id;
  const effectiveCreateWorkPillar = useMemo(() => {
    if (newTaskPillarId) {
      return newTaskPillarId === workPillar?.id;
    }
    return autoClassify?.pillarName === WORK_PILLAR_NAME;
  }, [newTaskPillarId, workPillar, autoClassify]);
  const showCreateProjectPicker =
    Boolean(workPillar) && effectiveCreateWorkPillar;

  const handleProjectCreated = useCallback((project: ProjectOption) => {
    setProjects((current) => [...current, project]);
  }, []);

  const handleCategoryFilterChange = useCallback(
    (pillarId: string | null) => {
      setCategoryFilter(pillarId);
      if (!workPillar || pillarId !== workPillar.id) {
        setProjectFilter(null);
      }
    },
    [workPillar],
  );

  const {
    patchTask,
    changePillar,
    changeProject,
    breakdownTask,
    applyBreakdown,
    toggleSubtask,
    updateTaskTitle,
    updateEstimatedMin,
    updateTaskDates,
    updateSubtaskTitle,
    updateSubtaskEstimatedMin,
    addSubtask,
    deleteSubtask,
    deleteTask,
    reorderSubtasks,
    logTime,
  } = useTaskActions({
    reload: load,
    errors: t.errors,
    onError: setError,
    pillars,
    projects,
    applyOptimisticTaskPatch,
    applyOptimisticSubtaskPatch,
  });

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const startAt = resolveTaskStartAt(newTaskStartAt, clientTimezone());
    const dueAt =
      recurrence.recurrenceType === "none"
        ? normalizeTaskDate(newTaskDueAt || null)
        : null;
    if (!isValidTaskDateRange(startAt, dueAt, clientTimezone())) {
      setError(t.errors.invalidTaskDateRange);
      return;
    }
    const resolvedPillarId =
      newTaskPillarId ||
      (newTaskProjectId && workPillar ? workPillar.id : undefined);
    try {
      setError(null);
      await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          autoBreakdown: true,
          startAt,
          ...(dueAt ? { dueAt } : {}),
          ...(resolvedPillarId ? { pillarId: resolvedPillarId } : {}),
          ...(newTaskProjectId ? { projectId: newTaskProjectId } : {}),
          ...(recurrenceTouched
            ? recurrence.recurrenceType !== "none"
              ? {
                  recurrenceType: recurrence.recurrenceType,
                  recurrenceDays: recurrenceTypeUsesDays(recurrence.recurrenceType)
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
      setNewTaskProjectId("");
      setNewTaskStartAt(defaultTaskStartAtInputValue(clientTimezone()));
      setNewTaskDueAt("");
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
    const byProject = filterTasksByProject(byPillar, projectFilter);
    if (statusFilter === "done") {
      return sortDoneTasksByCompletedAt(byProject);
    }
    return sortTasksByTime(byProject);
  }, [sourceTasks, categoryFilter, projectFilter, statusFilter]);

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
      projects={projects}
      workPillarId={workPillar?.id}
      onChangePillar={changePillar}
      onChangeProject={changeProject}
      onProjectCreated={handleProjectCreated}
      onBreakdown={breakdownTask}
      onApplyBreakdown={applyBreakdown}
      onAddSubtask={addSubtask}
      onDeleteSubtask={(id) => void deleteSubtask(id)}
      onDelete={(id) => void deleteTask(id)}
      onReorderSubtasks={reorderSubtasks}
      onToggleSubtask={toggleSubtask}
      onUpdateTitle={updateTaskTitle}
      onUpdateSubtaskTitle={updateSubtaskTitle}
      onUpdateSubtaskEstimatedMin={updateSubtaskEstimatedMin}
      onUpdateEstimatedMin={updateEstimatedMin}
      onUpdateTaskDates={updateTaskDates}
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
          recurrenceDays: recurrenceTypeUsesDays(value.recurrenceType)
            ? value.recurrenceDays
            : null,
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
      {sessionStatus === "loading" ? (
        <p className="text-sm text-muted">{t.common.loading}</p>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">{t.tasks.title}</h2>
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
              onChange={(e) => {
                const value = e.target.value;
                setNewTaskPillarId(value);
                if (!workPillar || value !== workPillar.id) {
                  setNewTaskProjectId("");
                }
              }}
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
          {showCreateProjectPicker && workPillar && (
            <ProjectSelectWithCreate
              value={newTaskProjectId}
              projects={projects}
              workPillarId={workPillar.id}
              onChange={(projectId) =>
                setNewTaskProjectId(projectId ?? "")
              }
              onProjectCreated={handleProjectCreated}
              onError={setError}
            />
          )}
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm text-white"
          >
            {t.common.add}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <label className="inline-flex items-center gap-1.5">
            <span>{t.taskCard.start}</span>
            <input
              type="datetime-local"
              value={newTaskStartAt}
              max={newTaskDueAt ? `${newTaskDueAt}T23:59` : undefined}
              onChange={(e) => setNewTaskStartAt(e.target.value)}
              className="rounded-md border border-border px-2 py-1 text-xs text-foreground"
            />
          </label>
          {recurrence.recurrenceType === "none" ? (
            <label className="inline-flex items-center gap-1.5">
              <span>{t.taskCard.due}</span>
              <input
                type="date"
                value={newTaskDueAt}
                min={newTaskStartAt.slice(0, 10) || undefined}
                onChange={(e) => setNewTaskDueAt(e.target.value)}
                className="rounded-md border border-border px-2 py-1 text-xs text-foreground"
              />
            </label>
          ) : (
            <span title={t.taskCard.dueDisabledForRecurrence}>
              {t.taskCard.dueDisabledForRecurrence}
            </span>
          )}
        </div>
        <TaskRecurrenceForm
          value={recurrence}
          onChange={(value) => {
            setRecurrenceTouched(true);
            setRecurrence(value);
            if (value.recurrenceType !== "none") {
              setNewTaskDueAt("");
            }
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
        onChange={handleCategoryFilterChange}
      />

      {showProjectFilters && (
        <ProjectFilter
          projects={projects}
          selectedProjectId={projectFilter}
          onChange={setProjectFilter}
        />
      )}

      <TaskStatusFilterBar value={statusFilter} onChange={setStatusFilter} />

      {filteredTasks.length === 0 ? (
        <p className="text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) =>
            renderTaskCard(
              task,
              statusFilter === "done" ? "reopen" : "complete",
            ),
          )}
        </div>
      )}
    </div>
  );
}
