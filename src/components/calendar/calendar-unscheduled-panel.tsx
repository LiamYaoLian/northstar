"use client";

import { useDroppable } from "@dnd-kit/core";
import { FormEvent, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import {
  UNSCHEDULED_DROPPABLE_ID,
  unscheduledDraggableId,
} from "@/lib/tasks/calendar-dnd";
import { isUnscheduledTask } from "@/lib/tasks/calendar";
import type { TaskRow } from "@/lib/tasks/enrich-tasks";
import { cn } from "@/lib/utils";
import { CalendarTaskChip } from "./calendar-task-chip";

type CalendarUnscheduledPanelProps = {
  tasks: TaskRow[];
  tz: string;
  onAddTask: (title: string) => Promise<void>;
  adding?: boolean;
};

export function CalendarUnscheduledPanel({
  tasks,
  tz,
  onAddTask,
  adding = false,
}: CalendarUnscheduledPanelProps) {
  const { t } = useLocale();
  const [title, setTitle] = useState("");
  const { setNodeRef, isOver } = useDroppable({
    id: UNSCHEDULED_DROPPABLE_ID,
  });

  const unscheduled = tasks.filter((task) => isUnscheduledTask(task, tz));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    await onAddTask(trimmed);
    setTitle("");
  }

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-[12rem] flex-col rounded-lg border border-border bg-card p-3 transition-colors lg:min-h-0 lg:w-64 lg:shrink-0",
        isOver && "ring-2 ring-accent/30",
      )}
      aria-label={t.calendar.unscheduledTitle}
    >
      <h2 className="mb-2 text-sm font-semibold">{t.calendar.unscheduledTitle}</h2>
      <form onSubmit={(e) => void handleSubmit(e)} className="mb-3 flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.calendar.quickAddPlaceholder}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          disabled={adding}
        />
        <button
          type="submit"
          disabled={adding || !title.trim()}
          className="rounded-md bg-accent px-2 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {t.common.add}
        </button>
      </form>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {unscheduled.length === 0 ? (
          <p className="text-sm text-muted">{t.calendar.unscheduledEmpty}</p>
        ) : (
          unscheduled.map((task) => (
            <CalendarTaskChip
              key={task.id}
              task={task}
              draggableId={unscheduledDraggableId(task.id)}
              dragLabel={t.calendar.dragTask}
            />
          ))
        )}
      </div>
    </section>
  );
}
