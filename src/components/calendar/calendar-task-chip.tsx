"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Repeat } from "lucide-react";
import type { TaskRow } from "@/lib/tasks/enrich-tasks";
import { cn } from "@/lib/utils";

type CalendarTaskChipProps = {
  task: TaskRow;
  draggableId: string;
  dragLabel: string;
  isOverlay?: boolean;
};

export function CalendarTaskChip({
  task,
  draggableId,
  dragLabel,
  isOverlay = false,
}: CalendarTaskChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: draggableId,
      disabled: isOverlay,
    });

  const style = isOverlay
    ? undefined
    : {
        transform: CSS.Translate.toString(transform),
      };

  const recurring = task.recurrenceType !== "none";

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "flex min-w-0 cursor-grab touch-none items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-xs shadow-sm active:cursor-grabbing",
        isDragging && !isOverlay && "opacity-30",
        isOverlay && "cursor-grabbing shadow-md ring-2 ring-accent/30",
      )}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      aria-label={dragLabel}
    >
      {task.pillarColor ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: task.pillarColor }}
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{task.title}</span>
      {recurring ? (
        <Repeat className="h-3 w-3 shrink-0 text-accent/80" aria-hidden />
      ) : null}
    </div>
  );
}

export function CalendarTaskChipOverlay({
  task,
  dragLabel,
}: {
  task: TaskRow;
  dragLabel: string;
}) {
  return (
    <CalendarTaskChip
      task={task}
      draggableId="overlay"
      dragLabel={dragLabel}
      isOverlay
    />
  );
}
