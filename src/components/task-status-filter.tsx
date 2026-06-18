"use client";

import { useLocale } from "@/lib/i18n/context";
import type { TaskStatusFilter } from "@/lib/services/task-sorting";
import { cn } from "@/lib/utils";

type TaskStatusFilterProps = {
  value: TaskStatusFilter;
  onChange: (value: TaskStatusFilter) => void;
};

export function TaskStatusFilterBar({ value, onChange }: TaskStatusFilterProps) {
  const { t } = useLocale();
  const options: { id: TaskStatusFilter; label: string }[] = [
    { id: "active", label: t.tasks.statusActive },
    { id: "deferred", label: t.tasks.statusDeferred },
    { id: "done", label: t.tasks.statusDone },
    { id: "all", label: t.tasks.statusAll },
  ];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t.tasks.title}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm transition-colors",
            value === option.id
              ? "border-accent bg-accent text-white"
              : "border-border text-muted hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
