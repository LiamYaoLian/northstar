"use client";

import { useState } from "react";
import { SortableSubtasks } from "@/components/sortable-subtasks";
import { Card } from "@/components/ui/card";
import { TaskRecurrenceBadge } from "@/components/task-recurrence-badge";
import {
  TaskRecurrenceForm,
  type RecurrenceFormValue,
} from "@/components/task-recurrence-form";
import { useLocale } from "@/lib/i18n/context";
import { parseJson } from "@/lib/utils";
import { parseRecurrenceDays } from "@/lib/tasks/recurrence-types";
import { TaskBreakdownDiff } from "./task-breakdown-diff";
import { TaskActionBar } from "./task-action-bar";
import { TaskAiBreakdownForm } from "./task-ai-breakdown-form";
import {
  TaskCategoryBadge,
  TaskCategorySelect,
} from "./task-category-select";
import { TaskCardHeader } from "./task-card-header";
import { TaskManualSubtaskForm } from "./task-manual-subtask-form";
import { TaskMetadataBadges } from "./task-metadata-badges";
import { TaskPriorityPanel } from "./task-priority-panel";
import type { PriorityFactors, TaskCardProps } from "./types";
import { useTaskCardForms } from "./use-task-card-forms";

export function TaskCard({
  task,
  rank,
  pillars,
  onComplete,
  onLogTime,
  onBreakdown,
  onApplyBreakdown,
  onToggleSubtask,
  onUpdateSubtaskTitle,
  onAddSubtask,
  onDeleteSubtask,
  onReorderSubtasks,
  onToggleIntimidating,
  onChangePillar,
  onUpdateEstimatedMin,
  onUpdateRecurrence,
}: TaskCardProps) {
  const { t } = useLocale();
  const [showWhy, setShowWhy] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [recurrenceDraft, setRecurrenceDraft] = useState<RecurrenceFormValue>(() => ({
    recurrenceType: task.recurrenceType as RecurrenceFormValue["recurrenceType"],
    recurrenceDays: parseRecurrenceDays(task.recurrenceDays) ?? [],
    recurrenceCarryOver: task.recurrenceCarryOver,
  }));
  const factors = parseJson<PriorityFactors | null>(task.priorityFactors, null);
  const subtaskList = task.subtasks ?? [];
  const canEditCategory = Boolean(pillars && onChangePillar);

  const forms = useTaskCardForms({
    taskId: task.id,
    onBreakdown,
    onApplyBreakdown,
    onAddSubtask,
  });

  return (
    <Card className="space-y-3">
      <TaskCardHeader
        task={task}
        rank={rank}
        priorityLabel={t.taskCard.priority}
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
        <TaskMetadataBadges
          estimatedMin={task.estimatedMin}
          dueAt={task.dueAt}
          intimidationScore={task.intimidationScore}
          subtasks={subtaskList}
          onUpdateEstimatedMin={
            onUpdateEstimatedMin
              ? (minutes) => onUpdateEstimatedMin(task.id, minutes)
              : undefined
          }
        />
      </TaskCardHeader>

      <TaskRecurrenceBadge task={task} />

      {onUpdateRecurrence && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowRecurrence((v) => !v)}
            className="text-xs text-accent hover:underline"
          >
            {t.recurrence.editRecurrence}
          </button>
          {showRecurrence && (
            <>
              <TaskRecurrenceForm
                compact
                value={recurrenceDraft}
                onChange={setRecurrenceDraft}
              />
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-neutral-50"
                onClick={() =>
                  onUpdateRecurrence(task.id, recurrenceDraft)
                }
              >
                {t.common.add}
              </button>
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
          onDelete={onDeleteSubtask}
        />
      )}

      {forms.pendingPreview && onApplyBreakdown ? (
        <TaskBreakdownDiff
          diff={forms.pendingPreview.diff}
          summary={forms.pendingPreview.summary}
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
          asEntryPoint={forms.asEntryPoint}
          adding={forms.adding}
          onTitleChange={forms.setSubtaskTitle}
          onEntryPointChange={forms.setAsEntryPoint}
          onSubmit={forms.handleAddSubtask}
        />
      )}

      <TaskActionBar
        task={task}
        showManual={forms.showManual}
        showAiBreakdown={forms.showAiBreakdown}
        onToggleManual={forms.toggleManual}
        onToggleAiBreakdown={forms.toggleAiBreakdown}
        onToggleWhy={() => setShowWhy((v) => !v)}
        onToggleIntimidating={onToggleIntimidating}
        onLogTime={onLogTime}
        onComplete={onComplete}
        hasAddSubtask={Boolean(onAddSubtask)}
        hasBreakdown={Boolean(onBreakdown)}
      />

      {showWhy && factors && <TaskPriorityPanel factors={factors} />}
    </Card>
  );
}

export type { PillarOption, TaskCardProps } from "./types";
