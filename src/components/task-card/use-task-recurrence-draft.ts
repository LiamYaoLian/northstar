"use client";

import { useEffect, useState } from "react";
import type { RecurrenceFormValue } from "@/components/task-recurrence-form";
import {
  isRecurrenceFormSavable,
  recurrenceFormMatchesTask,
} from "@/components/task-recurrence-form";
import { parseRecurrenceDays } from "@/lib/tasks/recurrence-types";
import type { TaskWithMeta } from "./types";

type RecurrenceUpdateHandler = (
  taskId: string,
  value: RecurrenceFormValue,
) => void;

function recurrenceFromTask(task: TaskWithMeta): RecurrenceFormValue {
  return {
    recurrenceType: task.recurrenceType as RecurrenceFormValue["recurrenceType"],
    recurrenceDays: parseRecurrenceDays(task.recurrenceDays) ?? [],
    recurrenceCarryOver: task.recurrenceCarryOver,
  };
}

export function useTaskRecurrenceDraft(
  task: TaskWithMeta,
  onUpdateRecurrence?: RecurrenceUpdateHandler,
) {
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [recurrenceDraft, setRecurrenceDraft] = useState<RecurrenceFormValue>(() =>
    recurrenceFromTask(task),
  );

  useEffect(() => {
    setRecurrenceDraft(recurrenceFromTask(task));
  }, [task.recurrenceType, task.recurrenceDays, task.recurrenceCarryOver]);

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

  return {
    showRecurrence,
    setShowRecurrence,
    recurrenceDraft,
    handleRecurrenceChange,
  };
}
