import {
  activeTimeSessions,
  strategicPillars,
  subtasks,
  taskCompletionEvents,
  tasks,
  timeEntries,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export function scopedTaskId(taskId: string, userId: string) {
  return and(eq(tasks.id, taskId), eq(tasks.userId, userId));
}

export function scopedSubtaskId(subtaskId: string, userId: string) {
  return and(eq(subtasks.id, subtaskId), eq(subtasks.userId, userId));
}

export function scopedSubtasksForTask(taskId: string, userId: string) {
  return and(eq(subtasks.parentTaskId, taskId), eq(subtasks.userId, userId));
}

export function scopedTimeEntriesForTask(taskId: string, userId: string) {
  return and(eq(timeEntries.taskId, taskId), eq(timeEntries.userId, userId));
}

export function scopedActiveSessionsForTask(taskId: string, userId: string) {
  return and(
    eq(activeTimeSessions.taskId, taskId),
    eq(activeTimeSessions.userId, userId),
  );
}

export function scopedCompletionEventsForTask(taskId: string, userId: string) {
  return and(
    eq(taskCompletionEvents.taskId, taskId),
    eq(taskCompletionEvents.userId, userId),
  );
}

export function scopedSubtaskIds(subtaskIds: string[], userId: string) {
  return and(inArray(subtasks.id, subtaskIds), eq(subtasks.userId, userId));
}

export function scopedPillarId(pillarId: string, userId: string) {
  return and(
    eq(strategicPillars.id, pillarId),
    eq(strategicPillars.userId, userId),
  );
}
