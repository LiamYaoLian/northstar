"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Check, Repeat } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import {
  CALENDAR_SLOT_HEIGHT_PX,
  CALENDAR_TASK_MIN_HEIGHT_PX,
} from "@/lib/tasks/calendar-time-grid";
import type { CalendarTaskFields } from "@/lib/tasks/calendar-time-grid";
import { cn } from "@/lib/utils";
import { useHoverTooltip } from "@/components/ui/hover-tooltip";

type CalendarTaskChipProps = {
  task: CalendarTaskFields;
  draggableId: string;
  dragLabel: string;
  heightPx?: number;
  durationHeightPx?: number;
  layout?: "default" | "timed";
  isOverlay?: boolean;
  onEdit?: () => void;
};

export function CalendarTaskChip({
  task,
  draggableId,
  dragLabel,
  heightPx = CALENDAR_SLOT_HEIGHT_PX,
  durationHeightPx,
  layout = "default",
  isOverlay = false,
  onEdit,
}: CalendarTaskChipProps) {
  const { t } = useLocale();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: draggableId,
      disabled: isOverlay,
    });

  const isTimed = layout === "timed";
  const resolvedDurationHeightPx =
    durationHeightPx ?? (isTimed ? heightPx : undefined);
  const fillHeightPx =
    resolvedDurationHeightPx != null
      ? Math.min(resolvedDurationHeightPx, heightPx)
      : undefined;
  const durationClamped =
    resolvedDurationHeightPx != null &&
    heightPx > resolvedDurationHeightPx + 0.5;
  const showDurationLabel =
    isTimed &&
    task.estimatedMin != null &&
    (durationClamped || heightPx <= CALENDAR_SLOT_HEIGHT_PX * 1.75);
  const tall = heightPx > CALENDAR_SLOT_HEIGHT_PX * 1.75;
  const recurring = task.recurrenceType !== "none";
  const isDone = task.status === "done";

  const style = isOverlay
    ? { height: heightPx, minHeight: CALENDAR_TASK_MIN_HEIGHT_PX }
    : {
        height: heightPx,
        minHeight: CALENDAR_TASK_MIN_HEIGHT_PX,
        transform: CSS.Translate.toString(transform),
      };

  const durationColor = task.pillarColor ?? "var(--accent)";
  const tooltipLabel = [
    task.title,
    isDone ? t.tasks.statusDone : null,
    onEdit ? t.calendar.doubleClickEdit : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const { bind: tooltipBind, tooltip } = useHoverTooltip(tooltipLabel, {
    disabled: isOverlay || isDragging,
  });

  return (
    <>
      <div
        ref={isOverlay ? undefined : setNodeRef}
        style={style}
        className={cn(
          "relative box-border flex h-full w-full min-w-0 cursor-grab touch-none flex-col overflow-hidden rounded border border-border bg-card/95 px-1 py-0.5 text-xs shadow-sm active:cursor-grabbing",
          isDone && "border-border/70 bg-neutral-50/95",
          isDragging && !isOverlay && "opacity-30",
          isOverlay && "cursor-grabbing shadow-md ring-2 ring-accent/30",
          !tall && "justify-center",
        )}
        {...(isOverlay ? {} : { ...attributes, ...listeners })}
        {...(isOverlay ? {} : tooltipBind)}
        onDoubleClick={
          onEdit
            ? (event) => {
                event.stopPropagation();
                onEdit();
              }
            : undefined
        }
        aria-label={dragLabel}
      >
      {isTimed && fillHeightPx != null && !isDone ? (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 opacity-20"
            style={{
              height: fillHeightPx,
              backgroundColor: durationColor,
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-0 top-0 w-[3px] rounded-l-sm"
            style={{
              height: fillHeightPx,
              backgroundColor: durationColor,
            }}
            aria-hidden
          />
        </>
      ) : null}
      <div className="relative z-[1] flex min-h-0 min-w-0 items-center gap-1">
        {!isTimed && task.pillarColor ? (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: task.pillarColor }}
            aria-hidden
          />
        ) : null}
        <span
          className={cn(
            "min-w-0 flex-1",
            tall ? "line-clamp-2" : "truncate",
            isDone && "text-muted line-through",
          )}
        >
          {task.title}
        </span>
        {isDone ? (
          <Check className="h-3 w-3 shrink-0 text-muted" aria-hidden />
        ) : null}
        {showDurationLabel ? (
          <span className="shrink-0 tabular-nums text-[10px] text-muted">
            {task.estimatedMin}m
          </span>
        ) : null}
        {recurring ? (
          <Repeat className="h-3 w-3 shrink-0 text-accent/80" aria-hidden />
        ) : null}
      </div>
      {tall && task.estimatedMin != null && !showDurationLabel ? (
        <span className="relative z-[1] mt-auto text-[10px] text-muted">
          {task.estimatedMin}m
        </span>
      ) : null}
      </div>
      {tooltip}
    </>
  );
}

export function CalendarTaskChipOverlay({
  task,
  dragLabel,
  heightPx,
  durationHeightPx,
}: {
  task: CalendarTaskFields;
  dragLabel: string;
  heightPx?: number;
  durationHeightPx?: number;
}) {
  return (
    <CalendarTaskChip
      task={task}
      draggableId="overlay"
      dragLabel={dragLabel}
      heightPx={heightPx}
      durationHeightPx={durationHeightPx}
      layout="timed"
      isOverlay
    />
  );
}
