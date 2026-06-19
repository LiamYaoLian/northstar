"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/context";

export function EditableSubtaskEstimate({
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

export function formatSubtaskEstimate(
  minutes: number | null | undefined,
  label: string,
) {
  if (minutes == null || minutes <= 0) return null;
  return `${minutes}${label}`;
}
