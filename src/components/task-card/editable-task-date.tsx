"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { localeTag } from "@/lib/i18n/entities";
import {
  formatTaskDate,
  normalizeTaskDate,
  taskDateToInputValue,
} from "@/lib/tasks/task-dates";

export function EditableTaskDate({
  label,
  value,
  addLabel,
  editLabel,
  min,
  disabled,
  disabledHint,
  onUpdate,
}: {
  label: string;
  value: string | null;
  addLabel: string;
  editLabel: string;
  min?: string;
  disabled?: boolean;
  disabledHint?: string;
  onUpdate: (value: string | null) => void;
}) {
  const { locale } = useLocale();
  const tag = localeTag(locale);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formatted = formatTaskDate(value, tag);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  function commit(nextValue: string) {
    const normalized = normalizeTaskDate(nextValue || null);
    const current = normalizeTaskDate(value);
    if (normalized !== current) {
      onUpdate(normalized);
    }
    setEditing(false);
  }

  if (disabled) {
    return (
      <span title={disabledHint} className="text-muted/70">
        {label} —
      </span>
    );
  }

  if (editing) {
    return (
      <label className="inline-flex items-center gap-1">
        <span>{label}</span>
        <input
          ref={inputRef}
          type="date"
          defaultValue={taskDateToInputValue(value)}
          min={min}
          aria-label={editLabel}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(e.currentTarget.value);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          className="rounded border border-border bg-background px-1 py-0 text-xs text-foreground"
        />
      </label>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded hover:bg-neutral-100 hover:text-foreground"
      aria-label={editLabel}
    >
      {formatted ? `${label} ${formatted}` : addLabel}
    </button>
  );
}
