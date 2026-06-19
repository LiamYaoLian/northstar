"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import type { Subtask } from "@/lib/db/schema";
import {
  EditableSubtaskEstimate,
  formatSubtaskEstimate,
} from "./editable-subtask-estimate";

export function SortableSubtaskRow({
  subtask,
  onToggle,
  onDelete,
  onUpdateTitle,
  onUpdateEstimatedMin,
  dragLabel,
  deleteLabel,
  editLabel,
  estimatedMinSuffix,
}: {
  subtask: Subtask;
  onToggle?: (id: string, isDone: boolean) => void;
  onDelete?: (id: string) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  onUpdateEstimatedMin?: (id: string, minutes: number | null) => void;
  dragLabel: string;
  deleteLabel: string;
  editLabel: string;
  estimatedMinSuffix: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: subtask.id });
  const [title, setTitle] = useState(subtask.title);

  useEffect(() => {
    setTitle(subtask.title);
  }, [subtask.title]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const titleClassName = subtask.isDone
    ? "flex-1 text-muted line-through"
    : "flex-1";

  const estimateLabel = formatSubtaskEstimate(
    subtask.estimatedMin,
    estimatedMinSuffix,
  );

  const estimateControl = onUpdateEstimatedMin ? (
    <EditableSubtaskEstimate
      estimatedMin={subtask.estimatedMin}
      estimatedMinSuffix={estimatedMinSuffix}
      onUpdate={(minutes) => onUpdateEstimatedMin(subtask.id, minutes)}
    />
  ) : (
    estimateLabel && (
      <span className="shrink-0 text-xs text-muted">{estimateLabel}</span>
    )
  );

  function commitTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(subtask.title);
      return;
    }
    if (trimmed !== subtask.title) {
      onUpdateTitle?.(subtask.id, trimmed);
    }
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-2 text-sm"
    >
      <button
        type="button"
        className="mt-0.5 cursor-grab touch-none text-muted hover:text-foreground active:cursor-grabbing"
        aria-label={dragLabel}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <input
        type="checkbox"
        checked={subtask.isDone}
        onChange={(e) => onToggle?.(subtask.id, e.target.checked)}
        className="mt-0.5"
      />
      <div className={titleClassName}>
        {onUpdateTitle ? (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <input
              type="text"
              value={title}
              aria-label={editLabel}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  setTitle(subtask.title);
                  e.currentTarget.blur();
                }
              }}
              className="min-w-0 flex-1 bg-transparent outline-none focus:rounded focus:ring-1 focus:ring-accent/40"
            />
            {estimateControl}
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span>{subtask.title}</span>
            {estimateControl}
          </div>
        )}
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(subtask.id)}
          className="text-xs text-muted opacity-0 hover:text-red-600 group-hover:opacity-100"
          title={deleteLabel}
        >
          {deleteLabel}
        </button>
      )}
    </li>
  );
}
