"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/context";
import { localeTag } from "@/lib/i18n/entities";
import type { Subtask } from "@/lib/db/schema";
import {
  formatTaskDate,
  normalizeTaskDate,
  taskDateToInputValue,
} from "@/lib/tasks/task-dates";
import { getSubtaskProgress, isTaskIntimidating } from "./utils";

type TaskMetadataBadgesProps = {
  estimatedMin: number | null;
  startAt: string | null;
  dueAt: string | null;
  canEditDue?: boolean;
  intimidationScore: number;
  subtasks: Subtask[];
  derivedFromSubtasks?: boolean;
  onUpdateEstimatedMin?: (minutes: number | null) => void;
  onUpdateTaskDates?: (patch: {
    startAt?: string | null;
    dueAt?: string | null;
  }) => void;
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

function EditableTaskDate({
  label,
  value,
  addLabel,
  editLabel,
  min,
  max,
  disabled,
  disabledHint,
  onUpdate,
}: {
  label: string;
  value: string | null;
  addLabel: string;
  editLabel: string;
  min?: string;
  max?: string;
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

export function TaskMetadataBadges({
  estimatedMin,
  startAt,
  dueAt,
  canEditDue = true,
  intimidationScore,
  subtasks,
  derivedFromSubtasks = false,
  onUpdateEstimatedMin,
  onUpdateTaskDates,
}: TaskMetadataBadgesProps) {
  const { localeTag: tag, t } = useLocale();
  const { done, total } = getSubtaskProgress(subtasks);
  const intimidating = isTaskIntimidating(intimidationScore);
  const startInput = taskDateToInputValue(startAt);
  const dueInput = taskDateToInputValue(dueAt);

  return (
    <>
      {onUpdateEstimatedMin ? (
        <EditableEstimatedMin
          estimatedMin={estimatedMin}
          onUpdate={onUpdateEstimatedMin}
        />
      ) : (
        estimatedMin != null && (
          <span title={derivedFromSubtasks ? t.taskCard.estimatedFromSubtasks : undefined}>
            {t.taskCard.estMin} {estimatedMin}min
            {derivedFromSubtasks ? ` (${t.taskCard.estimatedFromSubtasks})` : ""}
          </span>
        )
      )}
      {onUpdateTaskDates ? (
        <>
          <EditableTaskDate
            label={t.taskCard.start}
            value={startAt}
            addLabel={t.taskCard.addStartDate}
            editLabel={t.taskCard.editStartDate}
            max={dueInput || undefined}
            onUpdate={(next) => onUpdateTaskDates({ startAt: next })}
          />
          <EditableTaskDate
            label={t.taskCard.due}
            value={dueAt}
            addLabel={t.taskCard.addDueDate}
            editLabel={t.taskCard.editDueDate}
            min={startInput || undefined}
            disabled={!canEditDue}
            disabledHint={t.taskCard.dueDisabledForRecurrence}
            onUpdate={(next) => onUpdateTaskDates({ dueAt: next })}
          />
        </>
      ) : (
        <>
          {startAt && (
            <span>
              {t.taskCard.start}{" "}
              {formatTaskDate(startAt, tag)}
            </span>
          )}
          {dueAt && (
            <span>
              {t.taskCard.due}{" "}
              {formatTaskDate(dueAt, tag)}
            </span>
          )}
        </>
      )}
      {total > 0 && (
        <span>
          {t.taskCard.subtasks} {done}/{total}
        </span>
      )}
      {intimidating && (
        <span className="text-amber-600">{t.taskCard.intimidating}</span>
      )}
    </>
  );
}
