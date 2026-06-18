import type { Task } from "@/lib/db/schema";
import { toRecurrenceFields } from "@/lib/tasks/recurrence-types";
import { shouldShowOnToday } from "@/lib/tasks/recurrence";

export type TaskSortMode = "priority" | "manual";

export function sortTasks(rows: Task[], sort: TaskSortMode): Task[] {
  if (sort === "manual") {
    return [...rows].sort((a, b) => {
      if (a.manualSortOrder !== b.manualSortOrder) {
        return a.manualSortOrder - b.manualSortOrder;
      }
      return b.priorityScore - a.priorityScore;
    });
  }
  return [...rows].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return a.manualSortOrder - b.manualSortOrder;
  });
}

export function filterActiveTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status !== "done");
}

export function rankAndLimit(tasks: Task[], limit: number): Task[] {
  return sortTasks(tasks, "priority").slice(0, limit);
}

export function takeTopTasks(tasks: Task[], limit: number): Task[] {
  return rankAndLimit(filterActiveTasks(tasks), limit);
}

export function filterTasksDueToday(
  tasks: Task[],
  tz: string,
  now = new Date(),
): Task[] {
  return tasks.filter((task) =>
    shouldShowOnToday(toRecurrenceFields(task), now, tz),
  );
}
