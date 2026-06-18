import { csvCell, rowsToCsv } from "./csv-cell";

export type TimeEntryExportRow = {
  startedAt: string;
  durationMin: number;
  source: string;
  taskTitle: string;
  pillarName: string | null;
  focusTrack: string | null;
  note: string | null;
};

export function timeEntriesToCsv(rows: TimeEntryExportRow[]): string {
  const header = [
    "started_at",
    "duration_min",
    "source",
    "task_title",
    "pillar_name",
    "focus_track",
    "note",
  ];
  const data = rows.map((row) =>
    [
      row.startedAt,
      row.durationMin,
      row.source,
      row.taskTitle,
      row.pillarName,
      row.focusTrack,
      row.note,
    ].map(csvCell),
  );
  return rowsToCsv(header, data);
}
