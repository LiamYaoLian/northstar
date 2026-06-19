"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import { CalendarTaskEditModal } from "@/components/calendar/calendar-task-edit-modal";
import { TaskCard } from "@/components/task-card";
import { apiFetch } from "@/lib/api-client";
import { useTaskActions } from "@/lib/hooks/use-task-actions";
import { useLocale } from "@/lib/i18n/context";
import { findWorkPillar } from "@/lib/pillars";
import {
  enrichTasksWithPillars,
  enrichTasksWithProjects,
  filterTasksByPillar,
  parseStrategyPillars,
  toProjectOptions,
  type PillarOption,
  type ProjectOption,
  type TaskRow,
} from "@/lib/tasks/enrich-tasks";
import {
  parseCalendarUrlState,
  type CalendarView,
} from "@/lib/tasks/calendar";
import { recurrenceTypeUsesDays } from "@/lib/tasks/recurrence-types";
import { clientTimezone, localDateString } from "@/lib/tasks/timezone";

function CalendarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const tz = clientTimezone();

  const urlState = parseCalendarUrlState(searchParams, tz);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [pillars, setPillars] = useState<PillarOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [tasksData, strategyData, projectsData] = await Promise.all([
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
      setTasks(
        enrichTasksWithProjects(
          enrichTasksWithPillars(tasksData.tasks, strategyPillars),
          projectOptions,
        ),
      );
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

  const applyOptimisticSubtaskPatch = useCallback(
    (subtaskId: string, patch: Record<string, unknown>) => {
      let snapshot: TaskRow[] | null = null;

      setTasks((current) => {
        snapshot = current;
        return current.map((task) => {
          const subtasks = task.subtasks;
          if (!subtasks?.some((subtask) => subtask.id === subtaskId)) return task;
          return {
            ...task,
            subtasks: subtasks.map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, ...patch } : subtask,
            ),
          };
        });
      });

      return () => {
        if (snapshot) setTasks(snapshot);
      };
    },
    [],
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

  const workPillar = useMemo(() => findWorkPillar(pillars), [pillars]);

  const handleProjectCreated = useCallback((project: ProjectOption) => {
    setProjects((current) => [...current, project]);
  }, []);

  const visibleTasks = useMemo(() => {
    const active = tasks.filter((task) => task.status !== "done");
    return filterTasksByPillar(active, categoryFilter);
  }, [tasks, categoryFilter]);

  const editingTask = useMemo(
    () =>
      editingTaskId
        ? tasks.find((task) => task.id === editingTaskId) ?? null
        : null,
    [editingTaskId, tasks],
  );

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

  function closeTaskEdit() {
    setEditingTaskId(null);
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
        onTaskEdit={setEditingTaskId}
      />

      <CalendarTaskEditModal open={editingTask != null} onClose={closeTaskEdit}>
        {editingTask ? (
          <TaskCard
            task={editingTask}
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
            onDelete={(id) => {
              closeTaskEdit();
              void deleteTask(id);
            }}
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
            onComplete={(id) => {
              closeTaskEdit();
              void patchTask(id, { status: "done" });
            }}
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
        ) : null}
      </CalendarTaskEditModal>
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
