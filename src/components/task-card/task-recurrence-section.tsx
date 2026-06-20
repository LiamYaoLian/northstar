"use client";

import { TaskRecurrenceBadge } from "@/components/task-recurrence-badge";
import {
  TaskRecurrenceForm,
  type RecurrenceFormValue,
} from "@/components/task-recurrence-form";
import { useLocale } from "@/lib/i18n/context";
import type { TaskWithMeta } from "./types";

type TaskRecurrenceSectionProps = {
  task: TaskWithMeta;
  showRecurrence: boolean;
  onToggleShow: () => void;
  recurrenceDraft: RecurrenceFormValue;
  onRecurrenceChange: (value: RecurrenceFormValue) => void;
};

export function TaskRecurrenceSection({
  task,
  showRecurrence,
  onToggleShow,
  recurrenceDraft,
  onRecurrenceChange,
}: TaskRecurrenceSectionProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <TaskRecurrenceBadge task={task} showWhenNone prominent />
        <button
          type="button"
          onClick={onToggleShow}
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
            onChange={onRecurrenceChange}
          />
          {task.recurrenceType !== "none" && (
            <p className="text-xs text-muted">{t.recurrence.subtaskResetHint}</p>
          )}
        </>
      )}
    </div>
  );
}
