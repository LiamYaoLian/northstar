"use client";

import { useEffect, useState } from "react";
import type { TaskWithMeta } from "./types";

type TaskCardHeaderProps = {
  task: TaskWithMeta;
  rank?: number;
  editLabel?: string;
  onUpdateTitle?: (taskId: string, title: string) => void;
  children: React.ReactNode;
};

export function TaskCardHeader({
  task,
  rank,
  editLabel,
  onUpdateTitle,
  children,
}: TaskCardHeaderProps) {
  const [title, setTitle] = useState(task.title);

  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  function commitTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(task.title);
      return;
    }
    if (trimmed !== task.title) {
      onUpdateTitle?.(task.id, trimmed);
    }
  }

  const titleClassName =
    task.status === "done"
      ? "font-medium leading-snug text-muted line-through"
      : "font-medium leading-snug";

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        {rank != null && (
          <span className="text-xs font-medium text-muted">#{rank}</span>
        )}
        {onUpdateTitle ? (
          <input
            type="text"
            value={title}
            aria-label={editLabel}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                setTitle(task.title);
                e.currentTarget.blur();
              }
            }}
            className={`w-full bg-transparent outline-none focus:rounded focus:ring-1 focus:ring-accent/40 ${titleClassName}`}
          />
        ) : (
          <h3 className={titleClassName}>{task.title}</h3>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
          {children}
        </div>
      </div>
    </div>
  );
}
