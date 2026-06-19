"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SortableSubtasks } from "@/components/sortable-subtasks";
import { Card } from "@/components/ui/card";
import { TaskRecurrenceBadge } from "@/components/task-recurrence-badge";
import {
  TaskRecurrenceForm,
  type RecurrenceFormValue,
  isRecurrenceFormSavable,
  recurrenceFormMatchesTask,
} from "@/components/task-recurrence-form";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { parseRecurrenceDays } from "@/lib/tasks/recurrence-types";
import { resolveTaskEstimatedMin } from "@/lib/tasks/subtask-estimates";
import { TaskBreakdownDiff } from "./task-breakdown-diff";
import { TaskActionBar } from "./task-action-bar";
import { TaskAiBreakdownForm } from "./task-ai-breakdown-form";
import {
  TaskCategoryBadge,
  TaskCategorySelect,
} from "./task-category-select";
import { TaskProjectSelect } from "./task-project-select";
import { TaskCardHeader } from "./task-card-header";
import { TaskManualSubtaskForm } from "./task-manual-subtask-form";
import { TaskMetadataBadges } from "./task-metadata-badges";
import type { TaskCardProps } from "./types";
import { useTaskCardForms } from "./use-task-card-forms";
import { useTimer } from "@/components/timer-provider";
import { isWorkPillarOption, resolveSelectedPillar } from "./utils";

export function TaskCard({
  task,
  rank,
  pillars,
  projects,
  workPillarId,
  onComplete,
  onReopen,
  onLogTime,
  onTimerError,
  onBreakdown,
  onApplyBreakdown,
  onToggleSubtask,
  onUpdateTitle,
  onUpdateSubtaskTitle,
  onUpdateSubtaskEstimatedMin,
  onAddSubtask,
  onDeleteSubtask,
  onDelete,
  onReorderSubtasks,
  onToggleIntimidating,
  onChangePillar,
  onChangeProject,
  onProjectCreated,
  onUpdateEstimatedMin,
  onUpdateTaskDates,
  onUpdateRecurrence,
}: TaskCardProps) {
  const { t } = useLocale();
  const { isRunningOnTask, overtime, cancel } = useTimer();
  const runningHere = isRunningOnTask(task.id);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [recurrenceDraft, setRecurrenceDraft] = useState<RecurrenceFormValue>(() => ({
    recurrenceType: task.recurrenceType as RecurrenceFormValue["recurrenceType"],
    recurrenceDays: parseRecurrenceDays(task.recurrenceDays) ?? [],
    recurrenceCarryOver: task.recurrenceCarryOver,
  }));

  useEffect(() => {
    setRecurrenceDraft({
      recurrenceType: task.recurrenceType as RecurrenceFormValue["recurrenceType"],
      recurrenceDays: parseRecurrenceDays(task.recurrenceDays) ?? [],
      recurrenceCarryOver: task.recurrenceCarryOver,
    });
  }, [task.recurrenceType, task.recurrenceDays, task.recurrenceCarryOver]);
  const subtaskList = task.subtasks ?? [];
  const displayEstimatedMin = resolveTaskEstimatedMin(task.estimatedMin, subtaskList);
  const canEditCategory = Boolean(pillars && onChangePillar);
  const selectedPillar = resolveSelectedPillar(task, pillars);
  const showProjectSelect =
    Boolean(projects && onChangeProject) && isWorkPillarOption(selectedPillar);
  const canEditEstimatedMin = Boolean(onUpdateEstimatedMin) && subtaskList.length === 0;
  const canEditDueDate = task.recurrenceType === "none";

  const forms = useTaskCardForms({
    taskId: task.id,
    onBreakdown,
    onApplyBreakdown,
    onAddSubtask,
  });

  async function handleDelete() {
    if (!onDelete) return;
    try {
      if (runningHere) {
        await cancel();
      }
      onDelete(task.id);
    } catch (err) {
      onTimerError?.(
        err instanceof Error ? err.message : t.errors.cancelTimerFailed,
      );
    }
  }

  function handleRecurrenceChange(value: RecurrenceFormValue) {
    setRecurrenceDraft(value);
    if (
      !onUpdateRecurrence ||
      !isRecurrenceFormSavable(value) ||
      recurrenceFormMatchesTask(value, task)
    ) {
      return;
    }
    onUpdateRecurrence(task.id, value);
  }

  return (
    <Card
      className={cn(
        "relative space-y-3",
        onDelete && "pr-10",
        task.status === "done" && "border-neutral-200 bg-neutral-50/80 opacity-90",
        runningHere &&
          (overtime
            ? "ring-2 ring-amber-300"
            : "ring-2 ring-accent/40"),
      )}
    >
      {onDelete && (
        <button
          type="button"
          onClick={() => void handleDelete()}
          aria-label={t.taskCard.deleteTask}
          title={t.taskCard.deleteTask}
          className="absolute right-3 top-3 rounded-md p-1 text-muted hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      )}
      <TaskCardHeader
        task={task}
        rank={rank}
        priorityLabel={t.taskCard.priority}
        editLabel={t.taskCard.editTask}
        onUpdateTitle={onUpdateTitle}
      >
        {canEditCategory && pillars && onChangePillar ? (
          <TaskCategorySelect
            task={task}
            pillars={pillars}
            onChangePillar={onChangePillar}
          />
        ) : (
          <TaskCategoryBadge task={task} />
        )}
        {showProjectSelect && projects && onChangeProject && workPillarId ? (
          <TaskProjectSelect
            task={task}
            projects={projects}
            workPillarId={workPillarId}
            onChangeProject={onChangeProject}
            onProjectCreated={onProjectCreated ?? (() => {})}
            onError={onTimerError}
          />
        ) : null}
        <TaskMetadataBadges
          estimatedMin={displayEstimatedMin}
          startAt={task.startAt}
          dueAt={task.dueAt}
          canEditDue={canEditDueDate}
          intimidationScore={task.intimidationScore}
          subtasks={subtaskList}
          derivedFromSubtasks={subtaskList.length > 0}
          onUpdateEstimatedMin={
            canEditEstimatedMin && onUpdateEstimatedMin
              ? (minutes) => onUpdateEstimatedMin(task.id, minutes)
              : undefined
          }
          onUpdateTaskDates={
            onUpdateTaskDates
              ? (patch) => onUpdateTaskDates(task.id, patch)
              : undefined
          }
        />
        {!onUpdateRecurrence && <TaskRecurrenceBadge task={task} />}
      </TaskCardHeader>

      {onUpdateRecurrence && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <TaskRecurrenceBadge task={task} showWhenNone prominent />
            <button
              type="button"
              onClick={() => setShowRecurrence((v) => !v)}
              className="text-xs text-accent hover:underline"
            >
              {showRecurrence ? t.strategy.cancel : t.recurrence.editRecurrence}
            </button>
          </div>
          {showRecurrence && (
            <>
              <TaskRecurrenceForm
                compact
                value={recurrenceDraft}
                onChange={handleRecurrenceChange}
              />
              {task.recurrenceType !== "none" && (
                <p className="text-xs text-muted">{t.recurrence.subtaskResetHint}</p>
              )}
            </>
          )}
        </div>
      )}

      {subtaskList.length > 0 && onReorderSubtasks && (
        <SortableSubtasks
          taskId={task.id}
          subtasks={subtaskList}
          onReorder={onReorderSubtasks}
          onToggle={onToggleSubtask}
          onUpdateTitle={onUpdateSubtaskTitle}
          onUpdateEstimatedMin={onUpdateSubtaskEstimatedMin}
          onDelete={onDeleteSubtask}
        />
      )}

      {forms.pendingPreview && onApplyBreakdown ? (
        <TaskBreakdownDiff
          diff={forms.pendingPreview.diff}
          summary={forms.pendingPreview.summary}
          estimatedMinTotal={forms.pendingPreview.estimatedMinTotal}
          applying={forms.applying}
          onConfirm={() => void forms.handleConfirmBreakdown()}
          onCancel={forms.handleCancelBreakdown}
        />
      ) : (
        forms.showAiBreakdown &&
        onBreakdown && (
          <TaskAiBreakdownForm
            aiPrompt={forms.aiPrompt}
            breaking={forms.breaking}
            onPromptChange={forms.setAiPrompt}
            onSubmit={forms.handleBreakdown}
          />
        )
      )}

      {forms.showManual && onAddSubtask && (
        <TaskManualSubtaskForm
          subtaskTitle={forms.subtaskTitle}
          adding={forms.adding}
          onTitleChange={forms.setSubtaskTitle}
          onSubmit={forms.handleAddSubtask}
        />
      )}

      <TaskActionBar
        task={task}
        effectiveEstimatedMin={displayEstimatedMin}
        showManual={forms.showManual}
        showAiBreakdown={forms.showAiBreakdown}
        onToggleManual={forms.toggleManual}
        onToggleAiBreakdown={forms.toggleAiBreakdown}
        onToggleIntimidating={onToggleIntimidating}
        onLogTime={onLogTime}
        onTimerError={onTimerError}
        onComplete={onComplete}
        onReopen={onReopen}
        hasAddSubtask={Boolean(onAddSubtask)}
        hasBreakdown={Boolean(onBreakdown)}
      />
    </Card>
  );
}

export type { PillarOption, TaskCardProps } from "./types";
