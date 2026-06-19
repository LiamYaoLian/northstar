"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryFilter } from "@/components/category-filter";
import { useLocale } from "@/lib/i18n/context";
import { localeTag } from "@/lib/i18n/entities";
import type { CalendarView } from "@/lib/tasks/calendar";
import {
  buildMonthGrid,
  buildWeekDays,
  stepCalendarAnchor,
} from "@/lib/tasks/calendar";
import {
  parseDraggableTaskId,
  parseDayColumnDroppableId,
  resolveDragDrop,
} from "@/lib/tasks/calendar-dnd";
import {
  slotDroppableId,
  slotTimeFromDropPosition,
  taskBlockHeightPx,
} from "@/lib/tasks/calendar-time-grid";
import type { PillarOption, TaskRow } from "@/lib/tasks/enrich-tasks";
import { normalizeTaskStartAt } from "@/lib/tasks/task-dates";
import { clientTimezone, localDateString, monthInTz } from "@/lib/tasks/timezone";
import { cn } from "@/lib/utils";
import { CalendarMonthView } from "./calendar-month-view";
import { CalendarTaskChipOverlay } from "./calendar-task-chip";
import { CalendarUnscheduledPanel } from "./calendar-unscheduled-panel";
import { CalendarWeekView } from "./calendar-week-view";

type CalendarBoardProps = {
  tasks: TaskRow[];
  pillars: PillarOption[];
  categoryFilter: string | null;
  onCategoryFilterChange: (pillarId: string | null) => void;
  view: CalendarView;
  anchor: Date;
  onViewChange: (view: CalendarView) => void;
  onAnchorChange: (anchor: Date) => void;
  onScheduleTask: (taskId: string, startAt: string | null) => void;
  onAddUnscheduledTask: (title: string) => Promise<void>;
  addingTask?: boolean;
};

export function CalendarBoard({
  tasks,
  pillars,
  categoryFilter,
  onCategoryFilterChange,
  view,
  anchor,
  onViewChange,
  onAnchorChange,
  onScheduleTask,
  onAddUnscheduledTask,
  addingTask = false,
}: CalendarBoardProps) {
  const { locale, t } = useLocale();
  const tz = clientTimezone();
  const todayDateStr = localDateString(new Date(), tz);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const weekDays = useMemo(() => buildWeekDays(anchor, tz), [anchor, tz]);
  const monthRows = useMemo(() => buildMonthGrid(anchor, tz), [anchor, tz]);

  const activeTask = useMemo(() => {
    if (!activeId) return null;
    const taskId = parseDraggableTaskId(activeId);
    return tasks.find((task) => task.id === taskId) ?? null;
  }, [activeId, tasks]);

  const activeTaskHeight = activeTask
    ? taskBlockHeightPx(activeTask.estimatedMin)
    : undefined;

  const headerTitle = useMemo(() => {
    if (view === "month") {
      const anchorDateStr = localDateString(anchor, tz);
      const year = Number(anchorDateStr.slice(0, 4));
      const month = monthInTz(anchor, tz);
      return t.calendar.calendarMonthTitle(year, month);
    }
    const start = weekDays[0]?.dateStr ?? "";
    const end = weekDays[6]?.dateStr ?? "";
    const tag = localeTag(locale);
    const fmt = (dateStr: string) =>
      new Date(`${dateStr}T12:00:00`).toLocaleDateString(tag, {
        month: "short",
        day: "numeric",
      });
    return t.calendar.weekRange(fmt(start), fmt(end));
  }, [anchor, locale, t.calendar, tz, view, weekDays]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    const taskId = parseDraggableTaskId(String(active.id));
    if (!taskId) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    let overId = over?.id ? String(over.id) : null;
    if (overId) {
      const columnDate = parseDayColumnDroppableId(overId);
      if (columnDate && over?.rect) {
        const translated = active.rect.current.translated;
        if (translated) {
          const pointerY = translated.top + translated.height / 2;
          const timeStr = slotTimeFromDropPosition(
            pointerY,
            over.rect.top,
            over.rect.height,
          );
          if (timeStr) {
            overId = slotDroppableId(columnDate, timeStr);
          }
        }
      }
    }

    const result = resolveDragDrop(String(active.id), overId, task);
    if (!result) return;

    const nextStartAt =
      result.nextStartAt == null
        ? null
        : normalizeTaskStartAt(result.nextStartAt, tz);
    onScheduleTask(taskId, nextStartAt);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{t.calendar.title}</h1>
            <p className="text-sm text-muted">{t.calendar.subtitle}</p>
          </div>
          <CategoryFilter
            pillars={pillars}
            selectedPillarId={categoryFilter}
            onChange={onCategoryFilterChange}
          />
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          <CalendarUnscheduledPanel
            tasks={tasks}
            tz={tz}
            onAddTask={onAddUnscheduledTask}
            adding={addingTask}
          />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-border bg-card p-1 text-sm">
                {(["week", "month"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onViewChange(option)}
                    className={cn(
                      "rounded-md px-3 py-1.5 transition-colors",
                      view === option
                        ? "bg-accent text-white"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {option === "week" ? t.calendar.viewWeek : t.calendar.viewMonth}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onAnchorChange(stepCalendarAnchor(anchor, view, "prev", tz))
                  }
                  className="rounded-md border border-border p-1.5 hover:bg-neutral-50"
                  aria-label={t.calendar.prev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onAnchorChange(new Date())}
                  className="rounded-md border border-border px-2 py-1 text-sm hover:bg-neutral-50"
                >
                  {t.calendar.today}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAnchorChange(stepCalendarAnchor(anchor, view, "next", tz))
                  }
                  className="rounded-md border border-border p-1.5 hover:bg-neutral-50"
                  aria-label={t.calendar.next}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <span className="text-sm font-medium">{headerTitle}</span>
            </div>

            {view === "week" ? (
              <CalendarWeekView
                days={weekDays}
                tasks={tasks}
                tz={tz}
                todayDateStr={todayDateStr}
                dragLabel={t.calendar.dragTask}
                weekdayLabels={t.weekday}
              />
            ) : (
              <CalendarMonthView
                rows={monthRows}
                tasks={tasks}
                tz={tz}
                todayDateStr={todayDateStr}
                dragLabel={t.calendar.dragTask}
                moreLabel={t.calendar.moreTasks}
                weekdayLabels={t.weekday}
              />
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <CalendarTaskChipOverlay
            task={activeTask}
            dragLabel={t.calendar.dragTask}
            heightPx={activeTaskHeight}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
