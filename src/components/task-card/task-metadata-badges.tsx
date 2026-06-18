"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import type { Subtask } from "@/lib/db/schema";
import { getSubtaskProgress, isTaskIntimidating } from "./utils";

type TaskMetadataBadgesProps = {
  estimatedMin: number | null;
  dueAt: string | null;
  intimidationScore: number;
  subtasks: Subtask[];
  onUpdateEstimatedMin?: (minutes: number | null) => void;
};

function EditableEstimatedMin({
  estimatedMin,
  onUpdate,
}: {
  estimatedMin: number | null;
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
      <label className="inline-flex items-center gap-0.5">
        <span className="sr-only">{t.taskCard.editEstimatedMin}</span>
        <span>{t.taskCard.estMin}</span>
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
          className="w-12 rounded border border-border bg-background px-1 py-0 text-xs text-foreground"
        />
        <span>min</span>
      </label>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded hover:bg-neutral-100 hover:text-foreground"
      aria-label={t.taskCard.editEstimatedMin}
    >
      {estimatedMin != null
        ? `${t.taskCard.estMin} ${estimatedMin}min`
        : t.taskCard.addEstimatedMin}
    </button>
  );
}

export function TaskMetadataBadges({
  estimatedMin,
  dueAt,
  intimidationScore,
  subtasks,
  onUpdateEstimatedMin,
}: TaskMetadataBadgesProps) {
  const { localeTag, t } = useLocale();
  const { done, total } = getSubtaskProgress(subtasks);
  const intimidating = isTaskIntimidating(intimidationScore);

  return (
    <>
      {onUpdateEstimatedMin ? (
        <EditableEstimatedMin
          estimatedMin={estimatedMin}
          onUpdate={onUpdateEstimatedMin}
        />
      ) : (
        estimatedMin != null && (
          <span>
            {t.taskCard.estMin} {estimatedMin}min
          </span>
        )
      )}
      {total > 0 && (
        <span>
          {t.taskCard.subtasks} {done}/{total}
        </span>
      )}
      {dueAt && (
        <span>
          {t.taskCard.due}{" "}
          {new Date(dueAt).toLocaleDateString(localeTag)}
        </span>
      )}
      {intimidating && (
        <span className="text-amber-600">{t.taskCard.intimidating}</span>
      )}
    </>
  );
}
