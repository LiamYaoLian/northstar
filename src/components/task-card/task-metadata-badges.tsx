"use client";

import { useLocale } from "@/lib/i18n/context";
import type { Subtask } from "@/lib/db/schema";
import {
  formatTaskDate,
  formatTaskStartAt,
  taskDateToInputValue,
  taskStartAtToDateInputValue,
} from "@/lib/tasks/task-dates";
import { clientTimezone } from "@/lib/tasks/timezone";
import { EditableEstimatedMin } from "./editable-estimated-min";
import { EditableTaskDate } from "./editable-task-date";
import { EditableTaskStartAt } from "./editable-task-start-at";
import { getSubtaskProgress, isTaskIntimidating } from "./utils";

type TaskMetadataBadgesProps = {
  estimatedMin: number | null;
  startAt: string | null;
  dueAt: string | null;
  canEditDue?: boolean;
  intimidationScore: number;
  subtasks: Subtask[];
  derivedFromSubtasks?: boolean;
  onUpdateEstimatedMin?: (minutes: number | null) => void;
  onUpdateTaskDates?: (patch: {
    startAt?: string | null;
    dueAt?: string | null;
  }) => void;
};

export function TaskMetadataBadges({
  estimatedMin,
  startAt,
  dueAt,
  canEditDue = true,
  intimidationScore,
  subtasks,
  derivedFromSubtasks = false,
  onUpdateEstimatedMin,
  onUpdateTaskDates,
}: TaskMetadataBadgesProps) {
  const { localeTag: tag, t } = useLocale();
  const tz = clientTimezone();
  const { done, total } = getSubtaskProgress(subtasks);
  const intimidating = isTaskIntimidating(intimidationScore);
  const startDateInput = taskStartAtToDateInputValue(startAt, tz);
  const dueInput = taskDateToInputValue(dueAt);
  const startMax = dueInput ? `${dueInput}T23:59` : undefined;

  return (
    <>
      {onUpdateEstimatedMin ? (
        <EditableEstimatedMin
          estimatedMin={estimatedMin}
          onUpdate={onUpdateEstimatedMin}
        />
      ) : (
        estimatedMin != null && (
          <span title={derivedFromSubtasks ? t.taskCard.estimatedFromSubtasks : undefined}>
            {t.taskCard.estMin} {estimatedMin}min
            {derivedFromSubtasks ? ` (${t.taskCard.estimatedFromSubtasks})` : ""}
          </span>
        )
      )}
      {onUpdateTaskDates ? (
        <>
          <EditableTaskStartAt
            label={t.taskCard.start}
            value={startAt}
            addLabel={t.taskCard.addStartDate}
            editLabel={t.taskCard.editStartDate}
            clearLabel={t.taskCard.clearStartDate}
            max={startMax}
            onUpdate={(next) => onUpdateTaskDates({ startAt: next })}
          />
          <EditableTaskDate
            label={t.taskCard.due}
            value={dueAt}
            addLabel={t.taskCard.addDueDate}
            editLabel={t.taskCard.editDueDate}
            min={startDateInput || undefined}
            disabled={!canEditDue}
            disabledHint={t.taskCard.dueDisabledForRecurrence}
            onUpdate={(next) => onUpdateTaskDates({ dueAt: next })}
          />
        </>
      ) : (
        <>
          {startAt && (
            <span>
              {t.taskCard.start}{" "}
              {formatTaskStartAt(startAt, tag, tz)}
            </span>
          )}
          {dueAt && (
            <span>
              {t.taskCard.due}{" "}
              {formatTaskDate(dueAt, tag)}
            </span>
          )}
        </>
      )}
      {total > 0 && (
        <span>
          {t.taskCard.subtasks} {done}/{total}
        </span>
      )}
      {intimidating && (
        <span className="text-amber-600">{t.taskCard.intimidating}</span>
      )}
    </>
  );
}
