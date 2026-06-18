import type { TaskCompletionEvent } from "./completion-events";
import { makeTask } from "@/lib/test-fixtures";
import { testPillars } from "@/lib/test-fixtures";
import type { Task } from "@/lib/db/schema";

export {
  TEST_TZ,
  MONDAY_10AM_NY,
  MONDAY_8PM_NY,
  TUESDAY_10AM_NY,
  WEDNESDAY_10AM_NY,
  weeklyMonOnly,
  weeklyMonWed,
  dailyTask,
} from "./recurrence-test-helpers";

const workPillar = testPillars[0]!;

export function makeCompletionEvent(
  overrides: Partial<TaskCompletionEvent> = {},
): TaskCompletionEvent {
  return {
    id: "ce-1",
    taskId: "t1",
    completedAt: "2025-01-06T20:00:00.000Z",
    occurrenceDate: "2025-01-06",
    taskTitle: "LC",
    pillarId: workPillar.id,
    pillarName: workPillar.name,
    pillarColor: workPillar.color,
    focusTrack: "进大厂",
    recurrenceType: "none",
    createdAt: "2025-01-06T20:00:00.000Z",
    ...overrides,
  };
}

export function makeTaskForCompletion(overrides: Partial<Task> = {}): Task {
  return makeTask({
    id: "t1",
    title: "LC",
    pillarId: workPillar.id,
    focusTrack: "进大厂",
    status: "done",
    completedAt: "2025-01-06T20:00:00.000Z",
    ...overrides,
  });
}

export const pillarSnapshot = {
  pillarName: workPillar.name,
  pillarColor: workPillar.color,
};
