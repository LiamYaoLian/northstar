"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CategoryFilter } from "@/components/category-filter";
import { ProjectFilter } from "@/components/project-filter";
import { TaskCard } from "@/components/task-card";
import { TaskCreateForm } from "@/components/tasks/task-create-form";
import { TaskStatusFilterBar } from "@/components/task-status-filter";
import { useTimer } from "@/components/timer-provider";
import { useOptimisticTaskPatches } from "@/lib/hooks/use-optimistic-task-patches";
import { useTaskBoardData } from "@/lib/hooks/use-task-board-data";
import { useTaskActions } from "@/lib/hooks/use-task-actions";
import { useLocale } from "@/lib/i18n/context";
import { findWorkPillar } from "@/lib/pillars";
import {
  filterTasksByPillar,
  filterTasksByProject,
  type ProjectOption,
  type TaskRow,
} from "@/lib/tasks/enrich-tasks";
import { recurrenceTypeUsesDays } from "@/lib/tasks/recurrence-types";
import {
  filterTasksByStatus,
  sortDoneTasksByCompletedAt,
  sortTasksByTime,
  type TaskStatusFilter,
} from "@/lib/tasks/task-sorting";

export default function TasksPage() {
  const { status: sessionStatus } = useSession();
  const { t } = useLocale();
  const {
    tasks,
    setTasks,
    todayTasks,
    setTodayTasks,
    pillars,
    projects,
    setProjects,
    error,
    setError,
    reload: load,
  } = useTaskBoardData({ includeTodayTasks: true, requireAuth: true });
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("active");
  const [todayOnly, setTodayOnly] = useState(false);
  const { registerOnStop } = useTimer();

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    return registerOnStop(() => {
      void load();
    });
  }, [load, registerOnStop, sessionStatus]);

  const { applyOptimisticTaskPatch, applyOptimisticSubtaskPatch } =
    useOptimisticTaskPatches(setTasks, setTodayTasks);

  const workPillar = useMemo(() => findWorkPillar(pillars), [pillars]);
  const showProjectFilters =
    Boolean(workPillar) && categoryFilter === workPillar?.id;

  const handleProjectCreated = useCallback((project: ProjectOption) => {
    setProjects((current) => [...current, project]);
  }, [setProjects]);

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

      <TaskCreateForm
        pillars={pillars}
        projects={projects}
        sessionStatus={sessionStatus}
        todayOnly={todayOnly}
        onTodayOnlyChange={setTodayOnly}
        onProjectCreated={handleProjectCreated}
        onError={setError}
        onCreated={load}
      />

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
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
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
                statusFilter === "done"
                  ? undefined
                  : (id) => void patchTask(id, { status: "done" })
              }
              onReopen={
                statusFilter === "done"
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
          ))}
        </div>
      )}
    </div>
  );
}
