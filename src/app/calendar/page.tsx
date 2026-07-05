"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import { CalendarTaskEditModal } from "@/components/calendar/calendar-task-edit-modal";
import { TaskCard } from "@/components/task-card";
import { apiFetch } from "@/lib/api-client";
import { useOptimisticTaskPatches } from "@/lib/hooks/use-optimistic-task-patches";
import { useTaskBoardData } from "@/lib/hooks/use-task-board-data";
import { useTaskActions } from "@/lib/hooks/use-task-actions";
import { useLocale } from "@/lib/i18n/context";
import { findWorkPillar } from "@/lib/pillars";
import {
  filterTasksByPillar,
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
  const {
    tasks,
    setTasks,
    pillars,
    setProjects,
    projects,
    loading,
    error,
    setError,
    reload: load,
  } = useTaskBoardData({ trackLoading: true });
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const { applyOptimisticTaskPatch, applyOptimisticSubtaskPatch } =
    useOptimisticTaskPatches(setTasks);

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
  }, [setProjects]);

  const visibleTasks = useMemo(
    () => filterTasksByPillar(tasks, categoryFilter),
    [tasks, categoryFilter],
  );

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
