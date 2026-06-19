import type { FocusTrack, PriorityFactors, Subtask, Task } from "@/lib/db/schema";

import type { BreakdownPreviewResult } from "@/lib/tasks/subtask-diff";
import type { ProjectOption } from "@/lib/tasks/enrich-tasks";

export type PillarOption = {
  id: string;
  name: string;
  color: string;
  focusTracks?: FocusTrack[];
};

export type TaskWithMeta = Task & {
  pillarName?: string;
  pillarColor?: string;
  projectName?: string;
  subtasks?: Subtask[];
};

export type TaskCardProps = {
  task: TaskWithMeta;
  rank?: number;
  pillars?: PillarOption[];
  projects?: ProjectOption[];
  workPillarId?: string;
  onToggleIntimidating?: (id: string, intimidating: boolean) => void;
  onComplete?: (id: string) => void;
  onReopen?: (id: string) => void;
  onLogTime?: (id: string, minutes: number) => void;
  onTimerError?: (message: string) => void;
  onBreakdown?: (id: string, userPrompt?: string) => Promise<BreakdownPreviewResult | null>;
  onApplyBreakdown?: (
    taskId: string,
    proposed: BreakdownPreviewResult["proposed"],
  ) => Promise<void>;
  onToggleSubtask?: (subtaskId: string, isDone: boolean) => void;
  onUpdateTitle?: (taskId: string, title: string) => void;
  onUpdateSubtaskTitle?: (subtaskId: string, title: string) => void;
  onUpdateSubtaskEstimatedMin?: (subtaskId: string, minutes: number | null) => void;
  onAddSubtask?: (taskId: string, title: string) => Promise<void>;
  onDeleteSubtask?: (subtaskId: string) => void;
  onDelete?: (taskId: string) => void;
  onReorderSubtasks?: (
    taskId: string,
    orderedIds: string[],
  ) => Promise<void>;
  onChangePillar?: (
    taskId: string,
    pillarId: string | null,
    focusTrack?: string | null,
  ) => void;
  onChangeProject?: (taskId: string, projectId: string | null) => void;
  onProjectCreated?: (project: ProjectOption) => void;
  onUpdateEstimatedMin?: (taskId: string, minutes: number | null) => void;
  onUpdateTaskDates?: (
    taskId: string,
    patch: { startAt?: string | null; dueAt?: string | null },
  ) => void;
  onUpdateRecurrence?: (
    taskId: string,
    value: {
      recurrenceType: "none" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
      recurrenceDays: number[];
      recurrenceCarryOver: boolean;
    },
  ) => void;
};

export type { PriorityFactors };
