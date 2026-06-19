"use client";

import { useMemo } from "react";
import type { CalendarDay } from "@/lib/tasks/calendar";
import {
  CALENDAR_SLOT_HEIGHT_PX,
  DAY_TIME_SLOTS,
  buildWeekTaskSlotMap,
} from "@/lib/tasks/calendar-time-grid";
import type { TaskRow } from "@/lib/tasks/enrich-tasks";
import { isoWeekdayInTz } from "@/lib/tasks/timezone";
import { cn } from "@/lib/utils";
import { CalendarDayColumn } from "./calendar-day-column";

type CalendarWeekViewProps = {
  days: CalendarDay[];
  tasks: TaskRow[];
  tz: string;
  todayDateStr: string;
  dragLabel: string;
  weekdayLabels: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string>;
};

export function CalendarWeekView({
  days,
  tasks,
  tz,
  todayDateStr,
  dragLabel,
  weekdayLabels,
}: CalendarWeekViewProps) {
  const tasksBySlotKey = useMemo(
    () => buildWeekTaskSlotMap(tasks, days, tz),
    [tasks, days, tz],
  );

  const gridTemplateRows = `auto repeat(${DAY_TIME_SLOTS.length}, ${CALENDAR_SLOT_HEIGHT_PX}px)`;

  return (
    <div className="overflow-auto rounded-lg border border-border bg-card">
      <div
        className="grid min-w-[48rem]"
        style={{
          gridTemplateColumns: "4rem repeat(7, minmax(0, 1fr))",
          gridTemplateRows,
        }}
      >
        <div className="sticky left-0 top-0 z-20 border-b border-r border-border bg-neutral-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]" />
        {days.map((day, columnIndex) => {
          const weekday = isoWeekdayInTz(day.date, tz) as
            | 1
            | 2
            | 3
            | 4
            | 5
            | 6
            | 7;
          const isToday = day.dateStr === todayDateStr;
          return (
            <div
              key={`head-${day.dateStr}`}
              style={{ gridColumn: columnIndex + 2, gridRow: 1 }}
              className={cn(
                "sticky top-0 z-10 border-b border-r border-border bg-neutral-50 px-1 py-2 text-center text-xs",
                isToday && "bg-accent/10 font-semibold text-accent",
              )}
            >
              <div className="font-medium">{weekdayLabels[weekday]}</div>
              <div className={isToday ? "text-accent" : "text-muted"}>
                {day.dateStr.slice(5)}
              </div>
            </div>
          );
        })}

        {DAY_TIME_SLOTS.map((slot, rowIndex) => (
          <div
            key={slot.timeStr}
            style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
            className="sticky left-0 z-10 border-r border-border bg-neutral-50 px-1 text-right text-[11px] text-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
          >
            {slot.showHourLabel ? (
              <span className="-mt-2 block font-medium tabular-nums text-foreground/70">
                {slot.timeStr}
              </span>
            ) : null}
          </div>
        ))}

        {days.map((day, columnIndex) => (
          <div
            key={day.dateStr}
            style={{
              gridColumn: columnIndex + 2,
              gridRow: `2 / span ${DAY_TIME_SLOTS.length}`,
            }}
          >
            <CalendarDayColumn
              day={day}
              tasksBySlotKey={tasksBySlotKey}
              todayDateStr={todayDateStr}
              dragLabel={dragLabel}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
