import type { TaskWithMeta } from "./types";
import { formatPriorityScore } from "./utils";

type TaskCardHeaderProps = {
  task: TaskWithMeta;
  rank?: number;
  priorityLabel: string;
  children: React.ReactNode;
};

export function TaskCardHeader({
  task,
  rank,
  priorityLabel,
  children,
}: TaskCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        {rank != null && (
          <span className="text-xs font-medium text-muted">#{rank}</span>
        )}
        <h3 className="font-medium leading-snug">
          {task.isPinned && <span className="mr-1">📌</span>}
          {task.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
          {children}
        </div>
      </div>
      <div className="text-right text-xs text-muted">
        {priorityLabel} {formatPriorityScore(task.priorityScore)}
      </div>
    </div>
  );
}
