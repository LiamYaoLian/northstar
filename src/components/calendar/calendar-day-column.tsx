"use client";

import { useDroppable } from "@dnd-kit/core";
import type { CalendarDay } from "@/lib/tasks/calendar";
import { dayColumnDroppableId, occurrenceDraggableId } from "@/lib/tasks/calendar-dnd";
import type { CalendarTaskPlacement } from "@/lib/tasks/calendar-time-grid";
import { CALENDAR_SLOT_HEIGHT_PX, DAY_TIME_SLOTS } from "@/lib/tasks/calendar-time-grid";
import { cn } from "@/lib/utils";
import { CalendarTaskChip } from "./calendar-task-chip";

type CalendarDayColumnProps = {
  day: CalendarDay;
  placements: CalendarTaskPlacement[];
  todayDateStr: string;
  dragLabel: string;
  onTaskEdit?: (taskId: string) => void;
};

export function CalendarDayColumn({
  day,
  placements,
  todayDateStr,
  dragLabel,
  onTaskEdit,
}: CalendarDayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dayColumnDroppableId(day.dateStr),
  });

  const isToday = day.dateStr === todayDateStr;
  const columnHeight = DAY_TIME_SLOTS.length * CALENDAR_SLOT_HEIGHT_PX;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-r border-border",
        isToday && "bg-accent/[0.03]",
        isOver && "bg-accent/10 ring-1 ring-inset ring-accent/30",
      )}
      style={{ height: columnHeight }}
    >
      {DAY_TIME_SLOTS.map((slot) => (
        <div
          key={slot.timeStr}
          className="border-b border-border/60"
          style={{ height: CALENDAR_SLOT_HEIGHT_PX }}
        />
      ))}
      {placements.map(({ task, timeStr, topPx, heightPx }) => (
        <div
          key={`${task.id}-${timeStr}`}
          className="absolute left-0 right-0 z-[1] px-px"
          style={{ top: topPx, height: heightPx }}
        >
          <CalendarTaskChip
            task={task}
            draggableId={occurrenceDraggableId(task.id, day.dateStr, timeStr)}
            dragLabel={dragLabel}
            heightPx={heightPx}
            onEdit={onTaskEdit ? () => onTaskEdit(task.id) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
