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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import type { Subtask } from "@/lib/db/schema";
import { SortableSubtaskRow } from "./sortable-subtask-row";

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
      <SortableContext
        items={items.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
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
