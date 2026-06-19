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

function taskTimeSortKey(task: Task): number | null {
  if (task.startAt) {
    const start = Date.parse(task.startAt);
    if (Number.isFinite(start)) return start;
  }
  if (task.dueAt) {
    const due = Date.parse(task.dueAt);
    if (Number.isFinite(due)) return due;
  }
  return null;
}

export function sortTasksByTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aKey = taskTimeSortKey(a);
    const bKey = taskTimeSortKey(b);
    if (aKey == null && bKey == null) {
      return b.priorityScore - a.priorityScore || a.id.localeCompare(b.id);
    }
    if (aKey == null) return 1;
    if (bKey == null) return -1;
    if (aKey !== bKey) return aKey - bKey;
    return b.priorityScore - a.priorityScore || a.id.localeCompare(b.id);
  });
}
