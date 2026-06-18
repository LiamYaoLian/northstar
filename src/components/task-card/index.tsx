"use client";

import { useState } from "react";
import { SortableSubtasks } from "@/components/sortable-subtasks";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { parseJson } from "@/lib/utils";
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
  onPin,
  onComplete,
  onLogTime,
  onBreakdown,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onReorderSubtasks,
  onToggleIntimidating,
  onChangePillar,
}: TaskCardProps) {
  const { t } = useLocale();
  const [showWhy, setShowWhy] = useState(false);
  const factors = parseJson<PriorityFactors | null>(task.priorityFactors, null);
  const subtaskList = task.subtasks ?? [];
  const canEditCategory = Boolean(pillars && onChangePillar);

  const forms = useTaskCardForms({
    taskId: task.id,
    onBreakdown,
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
        />
      </TaskCardHeader>

      {subtaskList.length > 0 && onReorderSubtasks && (
        <SortableSubtasks
          taskId={task.id}
          subtasks={subtaskList}
          onReorder={onReorderSubtasks}
          onToggle={onToggleSubtask}
          onDelete={onDeleteSubtask}
        />
      )}

      {forms.showAiBreakdown && onBreakdown && (
        <TaskAiBreakdownForm
          aiPrompt={forms.aiPrompt}
          breaking={forms.breaking}
          onPromptChange={forms.setAiPrompt}
          onSubmit={forms.handleBreakdown}
        />
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
        onPin={onPin}
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
