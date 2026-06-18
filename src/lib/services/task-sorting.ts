import type { Task } from "@/lib/db/schema";
import { toRecurrenceFields } from "@/lib/tasks/recurrence-types";
import { shouldShowOnToday } from "@/lib/tasks/recurrence";

export type TaskSortMode = "priority" | "manual";

export type TaskStatusFilter = "active" | "done" | "all";

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

export function filterTasksByStatus(
  tasks: Task[],
  filter: TaskStatusFilter,
): Task[] {
  if (filter === "active") {
    return tasks.filter((t) => t.status !== "done");
  }
  if (filter === "done") {
    return tasks.filter((t) => t.status === "done");
  }
  return tasks;
}

export function sortDoneTasksByCompletedAt(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aTime = a.completedAt ? Date.parse(a.completedAt) : 0;
    const bTime = b.completedAt ? Date.parse(b.completedAt) : 0;
    return bTime - aTime;
  });
}
