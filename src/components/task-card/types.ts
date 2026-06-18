import type { FocusTrack, PriorityFactors, Subtask, Task } from "@/lib/db/schema";

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
  onPin?: (id: string, pinned: boolean) => void;
  onToggleIntimidating?: (id: string, intimidating: boolean) => void;
  onComplete?: (id: string) => void;
  onLogTime?: (id: string, minutes: number) => void;
  onBreakdown?: (id: string, userPrompt?: string) => Promise<void>;
  onToggleSubtask?: (subtaskId: string, isDone: boolean) => void;
  onUpdateSubtaskTitle?: (subtaskId: string, title: string) => void;
  onAddSubtask?: (
    taskId: string,
    title: string,
    isEntryPoint: boolean,
  ) => Promise<void>;
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
};

export type { PriorityFactors };
