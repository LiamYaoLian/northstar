"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import type { Subtask } from "@/lib/db/schema";

function formatSubtaskEstimate(minutes: number | null | undefined, label: string) {
  if (minutes == null || minutes <= 0) return null;
  return `${minutes}${label}`;
}

function EditableSubtaskEstimate({
  estimatedMin,
  estimatedMinSuffix,
  onUpdate,
}: {
  estimatedMin: number | null;
  estimatedMinSuffix: string;
  onUpdate: (minutes: number | null) => void;
}) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(estimatedMin != null ? String(estimatedMin) : "");
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, estimatedMin]);

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      if (estimatedMin != null) onUpdate(null);
      setEditing(false);
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setDraft(estimatedMin != null ? String(estimatedMin) : "");
      setEditing(false);
      return;
    }
    if (parsed !== estimatedMin) onUpdate(parsed);
    setEditing(false);
  }

  if (editing) {
    return (
      <label className="inline-flex shrink-0 items-center gap-0.5 text-xs text-muted">
        <span className="sr-only">{t.taskCard.editEstimatedMin}</span>
        <input
          ref={inputRef}
          type="number"
          min={1}
          step={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          className="w-10 rounded border border-border bg-background px-1 py-0 text-xs text-foreground"
        />
        <span>{estimatedMinSuffix}</span>
      </label>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="shrink-0 rounded text-xs text-muted hover:bg-neutral-100 hover:text-foreground"
      aria-label={t.taskCard.editEstimatedMin}
    >
      {estimatedMin != null && estimatedMin > 0
        ? `${estimatedMin}${estimatedMinSuffix}`
        : t.taskCard.addEstimatedMin}
    </button>
  );
}

function SortableSubtaskRow({
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

  const estimateLabel = formatSubtaskEstimate(subtask.estimatedMin, estimatedMinSuffix);

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

export function SortableSubtasks({
  taskId,
  subtasks,
  onReorder,
  onToggle,
  onUpdateTitle,
  onUpdateEstimatedMin,
  onDelete,
}: {
  taskId: string;
  subtasks: Subtask[];
  onReorder: (taskId: string, orderedIds: string[]) => Promise<void>;
  onToggle?: (id: string, isDone: boolean) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  onUpdateEstimatedMin?: (id: string, minutes: number | null) => void;
  onDelete?: (id: string) => void;
}) {
  const { t } = useLocale();
  const [items, setItems] = useState(subtasks);

  useEffect(() => {
    setItems(subtasks);
  }, [subtasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    try {
      await onReorder(
        taskId,
        next.map((s) => s.id),
      );
    } catch {
      setItems(previous);
    }
  }

  if (items.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => void handleDragEnd(event)}
    >
      <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1.5 border-l-2 border-neutral-200 pl-1">
          {items.map((st) => (
            <SortableSubtaskRow
              key={st.id}
              subtask={st}
              onToggle={onToggle}
              onUpdateTitle={onUpdateTitle}
              onUpdateEstimatedMin={onUpdateEstimatedMin}
              onDelete={onDelete}
              dragLabel={t.taskCard.dragSubtask}
              deleteLabel={t.taskCard.deleteSubtask}
              editLabel={t.taskCard.editSubtask}
              estimatedMinSuffix={t.taskCard.estimatedMinSuffix}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
