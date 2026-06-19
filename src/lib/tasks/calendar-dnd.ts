import type { Task } from "@/lib/db/schema";
import { startAtForCalendarDay } from "./calendar";
import {
  occurrenceSlotKey,
  parseSlotDroppableId,
  startAtForCalendarSlot,
} from "./calendar-time-grid";

export const UNSCHEDULED_DROPPABLE_ID = "drop:unscheduled";

export function occurrenceDraggableId(
  taskId: string,
  dateStr: string,
  timeStr?: string,
): string {
  if (timeStr) {
    return `occurrence:${taskId}:${occurrenceSlotKey(dateStr, timeStr)}`;
  }
  return `occurrence:${taskId}:${dateStr}`;
}

export function unscheduledDraggableId(taskId: string): string {
  return `unscheduled:${taskId}`;
}

export function dayDroppableId(dateStr: string): string {
  return `day:${dateStr}`;
}

export function dayColumnDroppableId(dateStr: string): string {
  return `day-column:${dateStr}`;
}

export function parseDayColumnDroppableId(overId: string): string | null {
  if (!overId.startsWith("day-column:")) return null;
  const dateStr = overId.slice("day-column:".length);
  return startAtForCalendarDay(dateStr);
}

export function parseDraggableTaskId(activeId: string): string | null {
  if (activeId.startsWith("unscheduled:")) {
    return activeId.slice("unscheduled:".length);
  }
  if (activeId.startsWith("occurrence:")) {
    const rest = activeId.slice("occurrence:".length);
    const colon = rest.indexOf(":");
    if (colon <= 0) return null;
    return rest.slice(0, colon);
  }
  return null;
}

export function parseOccurrenceSlotKey(activeId: string): string | null {
  if (!activeId.startsWith("occurrence:")) return null;
  const rest = activeId.slice("occurrence:".length);
  const colon = rest.indexOf(":");
  if (colon <= 0) return null;
  return rest.slice(colon + 1);
}

export function parseDayDroppableId(overId: string): string | null {
  if (!overId.startsWith("day:")) return null;
  const dateStr = overId.slice("day:".length);
  return startAtForCalendarDay(dateStr);
}

export type DragDropResult = {
  taskId: string;
  nextStartAt: string | null;
};

export function resolveDragDrop(
  activeId: string,
  overId: string | null | undefined,
  task: Pick<Task, "id" | "recurrenceType">,
): DragDropResult | null {
  if (!overId) return null;

  const taskId = parseDraggableTaskId(activeId);
  if (!taskId || taskId !== task.id) return null;

  if (overId === UNSCHEDULED_DROPPABLE_ID) {
    if (task.recurrenceType !== "none") return null;
    return { taskId, nextStartAt: null };
  }

  const slot = parseSlotDroppableId(overId);
  if (slot) {
    const nextStartAt = startAtForCalendarSlot(slot.dateStr, slot.timeStr);
    const sourceKey = parseOccurrenceSlotKey(activeId);
    if (sourceKey === occurrenceSlotKey(slot.dateStr, slot.timeStr)) {
      return null;
    }
    return { taskId, nextStartAt };
  }

  const dayOnly = parseDayDroppableId(overId);
  if (!dayOnly) return null;

  if (activeId.startsWith("occurrence:")) {
    const sourceKey = parseOccurrenceSlotKey(activeId);
    if (sourceKey === dayOnly || sourceKey?.startsWith(`${dayOnly}T`)) {
      return null;
    }
  }

  return { taskId, nextStartAt: dayOnly };
}
