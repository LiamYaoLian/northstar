import type { TaskCompletionEvent } from "@/lib/tasks/completion-events";
import { csvCell, rowsToCsv } from "./csv-cell";

export function completionsToCsv(events: TaskCompletionEvent[]): string {
  const header = [
    "occurrence_date",
    "task_title",
    "pillar_name",
    "focus_track",
    "recurrence_type",
    "completed_at",
  ];
  const rows = events.map((event) =>
    [
      event.occurrenceDate,
      event.taskTitle,
      event.pillarName,
      event.focusTrack,
      event.recurrenceType,
      event.completedAt,
    ].map(csvCell),
  );
  return rowsToCsv(header, rows);
}
