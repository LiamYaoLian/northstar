"use client";

import type { CalendarDay } from "@/lib/tasks/calendar";
import { taskAppearsOnDay } from "@/lib/tasks/calendar";
import type { TaskRow } from "@/lib/tasks/enrich-tasks";
import { CalendarDayCell, CalendarWeekdayHeader } from "./calendar-day-cell";

type CalendarMonthViewProps = {
  rows: CalendarDay[][];
  tasks: TaskRow[];
  tz: string;
  todayDateStr: string;
  dragLabel: string;
  moreLabel: (count: number) => string;
  weekdayLabels: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string>;
  onTaskEdit?: (taskId: string) => void;
};

export function CalendarMonthView({
  rows,
  tasks,
  tz,
  todayDateStr,
  dragLabel,
  moreLabel,
  weekdayLabels,
  onTaskEdit,
}: CalendarMonthViewProps) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 gap-1">
        {([1, 2, 3, 4, 5, 6, 7] as const).map((weekday) => (
          <CalendarWeekdayHeader
            key={weekday}
            weekdayLabel={weekdayLabels[weekday]}
          />
        ))}
      </div>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-7 gap-1">
          {row.map((day) => (
            <CalendarDayCell
              key={day.dateStr}
              day={day}
              tasks={tasks.filter((task) =>
                taskAppearsOnDay(task, day.date, tz),
              )}
              todayDateStr={todayDateStr}
              dragLabel={dragLabel}
              moreLabel={moreLabel}
              maxVisible={3}
              compact
              onTaskEdit={onTaskEdit}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
