"use client";

import { useDroppable } from "@dnd-kit/core";
import { useMemo } from "react";
import type { CalendarDay } from "@/lib/tasks/calendar";
import { dayColumnDroppableId, occurrenceDraggableId } from "@/lib/tasks/calendar-dnd";
import {
  CALENDAR_SLOT_HEIGHT_PX,
  DAY_TIME_SLOTS,
} from "@/lib/tasks/calendar-time-grid";
import type { TaskRow } from "@/lib/tasks/enrich-tasks";
import { cn } from "@/lib/utils";
import { CalendarTaskChip } from "./calendar-task-chip";

type CalendarDayColumnProps = {
  day: CalendarDay;
  tasksBySlotKey: Map<string, TaskRow[]>;
  todayDateStr: string;
  dragLabel: string;
};

export function CalendarDayColumn({
  day,
  tasksBySlotKey,
  todayDateStr,
  dragLabel,
}: CalendarDayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dayColumnDroppableId(day.dateStr),
  });

  const isToday = day.dateStr === todayDateStr;
  const columnHeight = DAY_TIME_SLOTS.length * CALENDAR_SLOT_HEIGHT_PX;

  const positionedTasks = useMemo(() => {
    const items: {
      task: TaskRow;
      timeStr: string;
      top: number;
    }[] = [];
    for (const slot of DAY_TIME_SLOTS) {
      const key = `${day.dateStr}:${slot.timeStr}`;
      const slotTasks = tasksBySlotKey.get(key);
      if (!slotTasks?.length) continue;
      for (const task of slotTasks) {
        items.push({
          task,
          timeStr: slot.timeStr,
          top: slot.slotIndex * CALENDAR_SLOT_HEIGHT_PX,
        });
      }
    }
    return items;
  }, [day.dateStr, tasksBySlotKey]);

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
      {positionedTasks.map(({ task, timeStr, top }) => (
        <div
          key={`${task.id}-${timeStr}`}
          className="absolute left-0 right-0 z-[1] px-px"
          style={{ top }}
        >
          <CalendarTaskChip
            task={task}
            draggableId={occurrenceDraggableId(task.id, day.dateStr, timeStr)}
            dragLabel={dragLabel}
          />
        </div>
      ))}
    </div>
  );
}
