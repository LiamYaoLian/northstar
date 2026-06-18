import type { RecurrenceTaskFields } from "@/lib/tasks/recurrence-types";
import { needsOccurrenceReset } from "@/lib/tasks/recurrence";
import { toRecurrenceFields } from "@/lib/tasks/recurrence-types";

export type TaskWithRecurrence = {
  id: string;
  recurrenceType: RecurrenceTaskFields["recurrenceType"];
  recurrenceDays: string | null;
  recurrenceCarryOver: boolean;
  status: string;
  completedAt: string | null;
};

/** Pure: which task ids should be reset before reads (no DB). */
export function planOccurrenceResets(
  tasks: TaskWithRecurrence[],
  tz: string,
  now?: Date,
): string[] {
  return tasks
    .filter((task) =>
      needsOccurrenceReset(toRecurrenceFields(task), now ?? new Date(), tz),
    )
    .map((task) => task.id);
}

export type SubtaskRow = { id: string; parentTaskId: string; isDone: boolean };

/** Pure: subtask ids to clear for a reset plan. */
export function subtaskIdsForResetPlan(
  plan: string[],
  subtasks: SubtaskRow[],
): string[] {
  const parents = new Set(plan);
  return subtasks.filter((s) => parents.has(s.parentTaskId) && s.isDone).map((s) => s.id);
}
