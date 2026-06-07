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
import { useEffect, useState, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n/context";

function SortableTaskWrapper({
  id,
  children,
  dragLabel,
}: {
  id: string;
  children: ReactNode;
  dragLabel: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2">
      <button
        type="button"
        className="mt-4 shrink-0 cursor-grab touch-none text-muted hover:text-foreground active:cursor-grabbing"
        aria-label={dragLabel}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function SortableTaskList({
  taskIds,
  onReorder,
  children,
}: {
  taskIds: string[];
  onReorder: (orderedIds: string[]) => Promise<void>;
  children: (taskId: string) => ReactNode;
}) {
  const { t } = useLocale();
  const [items, setItems] = useState(taskIds);

  useEffect(() => {
    setItems(taskIds);
  }, [taskIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.indexOf(String(active.id));
    const newIndex = items.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    try {
      await onReorder(next);
    } catch {
      setItems(previous);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => void handleDragEnd(event)}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((taskId) => (
            <SortableTaskWrapper
              key={taskId}
              id={taskId}
              dragLabel={t.taskCard.dragTask}
            >
              {children(taskId)}
            </SortableTaskWrapper>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
