import type { RecurrenceType } from "./recurrence-types";
import { toRecurrenceFields } from "./recurrence-types";
import type { Task } from "@/lib/db/schema";
import { lastScheduledOnOrBefore } from "./recurrence";
import { localDateString } from "./timezone";

export type TaskCompletionEvent = {
  id: string;
  taskId: string;
  completedAt: string;
  occurrenceDate: string;
  taskTitle: string;
  pillarId: string | null;
  pillarName: string | null;
  pillarColor: string | null;
  focusTrack: string | null;
  recurrenceType: RecurrenceType;
  createdAt: string;
};

export type PillarSnapshot = {
  pillarName: string | null;
  pillarColor: string | null;
};

export type CompletionSummaryRow = {
  pillarId: string | null;
  count: number;
  topTitles: string[];
};

/** Only insert when transitioning into done. */
export function shouldRecordCompletionTransition(
  previousStatus: string,
  nextStatus: string,
): boolean {
  return previousStatus !== "done" && nextStatus === "done";
}

/** Plan §1.2 occurrence_date from task + completion instant. */
export function computeOccurrenceDate(
  task: Pick<
    Task,
    | "recurrenceType"
    | "recurrenceDays"
    | "recurrenceCarryOver"
    | "status"
    | "completedAt"
  >,
  tz: string,
  completedAt: Date,
): string {
  const recurrenceType = (task.recurrenceType ?? "none") as RecurrenceType;
  if (recurrenceType === "none" || recurrenceType === "daily") {
    return localDateString(completedAt, tz);
  }
  const fields = toRecurrenceFields(task);
  const last = lastScheduledOnOrBefore(fields, completedAt, tz);
  return localDateString(last ?? completedAt, tz);
}

export function buildCompletionEventPayload(
  task: Task,
  tz: string,
  completedAt: Date,
  snapshot: PillarSnapshot,
  id: string,
  createdAt: string,
): Omit<TaskCompletionEvent, never> {
  return {
    id,
    taskId: task.id,
    completedAt: completedAt.toISOString(),
    occurrenceDate: computeOccurrenceDate(task, tz, completedAt),
    taskTitle: task.title,
    pillarId: task.pillarId,
    pillarName: snapshot.pillarName,
    pillarColor: snapshot.pillarColor,
    focusTrack: task.focusTrack,
    recurrenceType: (task.recurrenceType ?? "none") as RecurrenceType,
    createdAt,
  };
}

export function filterCompletionEvents(
  events: TaskCompletionEvent[],
  query: {
    since: string;
    until: string;
    pillarId?: string | null;
    limit?: number;
  },
): TaskCompletionEvent[] {
  let result = events.filter(
    (event) =>
      event.occurrenceDate >= query.since &&
      event.occurrenceDate <= query.until &&
      (query.pillarId === undefined ||
        event.pillarId === query.pillarId),
  );

  result = [...result].sort((a, b) => {
    if (a.occurrenceDate !== b.occurrenceDate) {
      return b.occurrenceDate.localeCompare(a.occurrenceDate);
    }
    return b.completedAt.localeCompare(a.completedAt);
  });

  if (query.limit != null) {
    result = result.slice(0, query.limit);
  }

  return result;
}

export function summarizeCompletionEventsByPillar(
  events: TaskCompletionEvent[],
  topN = 3,
): CompletionSummaryRow[] {
  const byPillar = new Map<string | null, { count: number; titles: string[] }>();

  for (const event of events) {
    const key = event.pillarId;
    const row = byPillar.get(key) ?? { count: 0, titles: [] };
    row.count += 1;
    if (row.titles.length < topN) {
      row.titles.push(event.taskTitle);
    }
    byPillar.set(key, row);
  }

  return [...byPillar.entries()]
    .map(([pillarId, row]) => ({
      pillarId,
      count: row.count,
      topTitles: row.titles,
    }))
    .sort((a, b) => b.count - a.count || String(a.pillarId).localeCompare(String(b.pillarId)));
}

export function groupCompletionEventsByDate(
  events: TaskCompletionEvent[],
): { date: string; events: TaskCompletionEvent[] }[] {
  const sorted = [...events].sort((a, b) => {
    if (a.occurrenceDate !== b.occurrenceDate) {
      return b.occurrenceDate.localeCompare(a.occurrenceDate);
    }
    return b.completedAt.localeCompare(a.completedAt);
  });

  const groups: { date: string; events: TaskCompletionEvent[] }[] = [];
  for (const event of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.date === event.occurrenceDate) {
      last.events.push(event);
    } else {
      groups.push({ date: event.occurrenceDate, events: [event] });
    }
  }
  return groups;
}

export type PillarLookup = {
  id: string;
  name: string;
  color: string;
};

/** Snapshot pillar name/color at completion time; nulls when unassigned or missing. */
export function resolvePillarSnapshotForCompletion(
  task: Pick<Task, "pillarId">,
  pillars: PillarLookup[],
): PillarSnapshot {
  if (!task.pillarId) {
    return { pillarName: null, pillarColor: null };
  }
  const pillar = pillars.find((p) => p.id === task.pillarId);
  if (!pillar) {
    return { pillarName: null, pillarColor: null };
  }
  return { pillarName: pillar.name, pillarColor: pillar.color };
}
