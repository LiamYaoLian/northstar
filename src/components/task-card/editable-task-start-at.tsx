"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { localeTag } from "@/lib/i18n/entities";
import {
  formatTaskStartAt,
  normalizeTaskStartAt,
  taskStartAtToInputValue,
} from "@/lib/tasks/task-dates";
import { clientTimezone } from "@/lib/tasks/timezone";

export function EditableTaskStartAt({
  label,
  value,
  addLabel,
  editLabel,
  clearLabel,
  max,
  onUpdate,
}: {
  label: string;
  value: string | null;
  addLabel: string;
  editLabel: string;
  clearLabel: string;
  max?: string;
  onUpdate: (value: string | null) => void;
}) {
  const { locale } = useLocale();
  const tag = localeTag(locale);
  const tz = clientTimezone();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formatted = formatTaskStartAt(value, tag, tz);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  function commit(nextValue: string) {
    const normalized = normalizeTaskStartAt(nextValue || null, tz);
    const current = normalizeTaskStartAt(value, tz);
    if (normalized !== current) {
      onUpdate(normalized);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <label className="inline-flex items-center gap-1">
          <span>{label}</span>
          <input
            ref={inputRef}
            type="datetime-local"
            defaultValue={taskStartAtToInputValue(value, tz)}
            max={max}
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
        {value ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onUpdate(null);
              setEditing(false);
            }}
            className="rounded px-1 text-xs text-muted hover:bg-neutral-100 hover:text-foreground"
          >
            {clearLabel}
          </button>
        ) : null}
      </span>
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
