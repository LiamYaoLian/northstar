"use client";

import { useDroppable } from "@dnd-kit/core";
import type { CalendarDay } from "@/lib/tasks/calendar";
import {
  dayDroppableId,
  occurrenceDraggableId,
} from "@/lib/tasks/calendar-dnd";
import type { TaskRow } from "@/lib/tasks/enrich-tasks";
import { cn } from "@/lib/utils";
import { CalendarTaskChip } from "./calendar-task-chip";

type CalendarDayCellProps = {
  day: CalendarDay;
  tasks: TaskRow[];
  todayDateStr: string;
  dragLabel: string;
  moreLabel?: (count: number) => string;
  maxVisible?: number;
  showWeekdayLabel?: boolean;
  weekdayLabel?: string;
  compact?: boolean;
};

export function CalendarDayCell({
  day,
  tasks,
  todayDateStr,
  dragLabel,
  moreLabel,
  maxVisible,
  showWeekdayLabel = false,
  weekdayLabel,
  compact = false,
}: CalendarDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dayDroppableId(day.dateStr),
  });

  const isToday = day.dateStr === todayDateStr;
  const visibleTasks =
    maxVisible != null && tasks.length > maxVisible
      ? tasks.slice(0, maxVisible)
      : tasks;
  const overflow =
    maxVisible != null && tasks.length > maxVisible
      ? tasks.length - maxVisible
      : 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-0 min-w-0 flex-col rounded-md border p-1 transition-colors",
        compact ? "min-h-[5.5rem]" : "min-h-[8rem]",
        day.inMonth ? "border-border bg-card" : "border-transparent bg-neutral-50/80",
        isToday && "ring-2 ring-accent/40",
        isOver && "bg-accent/5 ring-2 ring-accent/30",
      )}
    >
      <div
        className={cn(
          "mb-1 flex items-baseline gap-1 px-0.5 text-xs",
          day.inMonth ? "text-foreground" : "text-muted",
          isToday && "font-semibold text-accent",
        )}
      >
        {showWeekdayLabel && weekdayLabel ? (
          <span className="text-muted">{weekdayLabel}</span>
        ) : null}
        <span>{day.dateStr.slice(8)}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
        {visibleTasks.map((task) => (
          <CalendarTaskChip
            key={occurrenceDraggableId(task.id, day.dateStr)}
            task={task}
            draggableId={occurrenceDraggableId(task.id, day.dateStr)}
            dragLabel={dragLabel}
          />
        ))}
        {overflow > 0 && moreLabel ? (
          <span className="px-0.5 text-[10px] text-muted">{moreLabel(overflow)}</span>
        ) : null}
      </div>
    </div>
  );
}

export function CalendarWeekdayHeader({
  weekdayLabel,
}: {
  weekdayLabel: string;
}) {
  return (
    <div className="px-1 py-1 text-center text-xs font-medium text-muted">
      {weekdayLabel}
    </div>
  );
}
