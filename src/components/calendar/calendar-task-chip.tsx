"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Repeat } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { CALENDAR_SLOT_HEIGHT_PX } from "@/lib/tasks/calendar-time-grid";
import type { TaskRow } from "@/lib/tasks/enrich-tasks";
import { cn } from "@/lib/utils";

type CalendarTaskChipProps = {
  task: TaskRow;
  draggableId: string;
  dragLabel: string;
  heightPx?: number;
  isOverlay?: boolean;
  onEdit?: () => void;
};

export function CalendarTaskChip({
  task,
  draggableId,
  dragLabel,
  heightPx = CALENDAR_SLOT_HEIGHT_PX,
  isOverlay = false,
  onEdit,
}: CalendarTaskChipProps) {
  const { t } = useLocale();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: draggableId,
      disabled: isOverlay,
    });

  const style = isOverlay
    ? { height: heightPx, minHeight: CALENDAR_SLOT_HEIGHT_PX }
    : {
        height: heightPx,
        minHeight: CALENDAR_SLOT_HEIGHT_PX,
        transform: CSS.Translate.toString(transform),
      };

  const recurring = task.recurrenceType !== "none";
  const tall = heightPx > CALENDAR_SLOT_HEIGHT_PX * 1.5;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "flex min-w-0 cursor-grab touch-none flex-col overflow-hidden rounded border border-border bg-card/95 px-1 py-0.5 text-xs shadow-sm active:cursor-grabbing",
        isDragging && !isOverlay && "opacity-30",
        isOverlay && "cursor-grabbing shadow-md ring-2 ring-accent/30",
        !tall && "justify-center",
      )}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      onDoubleClick={
        onEdit
          ? (event) => {
              event.stopPropagation();
              onEdit();
            }
          : undefined
      }
      title={onEdit ? t.calendar.doubleClickEdit : undefined}
      aria-label={dragLabel}
    >
      <div className="flex min-h-0 min-w-0 items-center gap-1">
        {task.pillarColor ? (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: task.pillarColor }}
            aria-hidden
          />
        ) : null}
        <span className={cn("min-w-0 flex-1", tall ? "line-clamp-2" : "truncate")}>
          {task.title}
        </span>
        {recurring ? (
          <Repeat className="h-3 w-3 shrink-0 text-accent/80" aria-hidden />
        ) : null}
      </div>
      {tall && task.estimatedMin != null ? (
        <span className="mt-auto text-[10px] text-muted">{task.estimatedMin}m</span>
      ) : null}
    </div>
  );
}

export function CalendarTaskChipOverlay({
  task,
  dragLabel,
  heightPx,
}: {
  task: TaskRow;
  dragLabel: string;
  heightPx?: number;
}) {
  return (
    <CalendarTaskChip
      task={task}
      draggableId="overlay"
      dragLabel={dragLabel}
      heightPx={heightPx}
      isOverlay
    />
  );
}
