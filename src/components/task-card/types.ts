import type { FocusTrack, PriorityFactors, Subtask, Task } from "@/lib/db/schema";

import type { BreakdownPreviewResult } from "@/lib/tasks/subtask-diff";

export type PillarOption = {
  id: string;
  name: string;
  color: string;
  focusTracks?: FocusTrack[];
};

export type TaskWithMeta = Task & {
  pillarName?: string;
  pillarColor?: string;
  subtasks?: Subtask[];
};

export type TaskCardProps = {
  task: TaskWithMeta;
  rank?: number;
  pillars?: PillarOption[];
  onToggleIntimidating?: (id: string, intimidating: boolean) => void;
  onComplete?: (id: string) => void;
  onReopen?: (id: string) => void;
  onLogTime?: (id: string, minutes: number) => void;
  onBreakdown?: (id: string, userPrompt?: string) => Promise<BreakdownPreviewResult | null>;
  onApplyBreakdown?: (
    taskId: string,
    proposed: BreakdownPreviewResult["proposed"],
  ) => Promise<void>;
  onToggleSubtask?: (subtaskId: string, isDone: boolean) => void;
  onUpdateSubtaskTitle?: (subtaskId: string, title: string) => void;
  onAddSubtask?: (taskId: string, title: string) => Promise<void>;
  onDeleteSubtask?: (subtaskId: string) => void;
  onReorderSubtasks?: (
    taskId: string,
    orderedIds: string[],
  ) => Promise<void>;
  onChangePillar?: (
    taskId: string,
    pillarId: string | null,
    focusTrack?: string | null,
  ) => void;
  onUpdateEstimatedMin?: (taskId: string, minutes: number | null) => void;
  onUpdateRecurrence?: (
    taskId: string,
    value: {
      recurrenceType: "none" | "daily" | "weekly";
      recurrenceDays: number[];
      recurrenceCarryOver: boolean;
    },
  ) => void;
};

export type { PriorityFactors };
