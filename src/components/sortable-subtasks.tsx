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
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import type { Subtask } from "@/lib/db/schema";

function SortableSubtaskRow({
  subtask,
  onToggle,
  onDelete,
  onUpdateTitle,
  dragLabel,
  deleteLabel,
  editLabel,
  entryPointBadge,
}: {
  subtask: Subtask;
  onToggle?: (id: string, isDone: boolean) => void;
  onDelete?: (id: string) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  dragLabel: string;
  deleteLabel: string;
  editLabel: string;
  entryPointBadge: string;
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
    : subtask.isEntryPoint
      ? "flex-1 font-medium text-accent"
      : "flex-1";

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
        {subtask.isEntryPoint && !subtask.isDone && (
          <span className="mr-1 text-xs text-accent">{entryPointBadge}</span>
        )}
        {onUpdateTitle ? (
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
            className="w-full bg-transparent outline-none focus:rounded focus:ring-1 focus:ring-accent/40"
          />
        ) : (
          <span>{subtask.title}</span>
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
  onDelete,
}: {
  taskId: string;
  subtasks: Subtask[];
  onReorder: (taskId: string, orderedIds: string[]) => Promise<void>;
  onToggle?: (id: string, isDone: boolean) => void;
  onUpdateTitle?: (id: string, title: string) => void;
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
              onDelete={onDelete}
              dragLabel={t.taskCard.dragSubtask}
              deleteLabel={t.taskCard.deleteSubtask}
              editLabel={t.taskCard.editSubtask}
              entryPointBadge={t.taskCard.entryPointBadge}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
