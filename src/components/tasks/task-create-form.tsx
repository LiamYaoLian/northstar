"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProjectSelectWithCreate } from "@/components/project-select-with-create";
import {
  TaskRecurrenceForm,
  defaultRecurrenceFormValue,
  type RecurrenceFormValue,
} from "@/components/task-recurrence-form";
import { apiFetch } from "@/lib/api-client";
import { useTaskTitleAnalysis } from "@/lib/hooks/use-task-title-analysis";
import { useLocale } from "@/lib/i18n/context";
import { translatePillar } from "@/lib/i18n/entities";
import { findWorkPillar, WORK_PILLAR_NAME } from "@/lib/pillars";
import type { PillarOption, ProjectOption } from "@/lib/tasks/enrich-tasks";
import { recurrenceTypeUsesDays } from "@/lib/tasks/recurrence-types";
import {
  defaultTaskStartAtInputValue,
  isValidTaskDateRange,
  normalizeTaskDate,
  resolveTaskStartAt,
} from "@/lib/tasks/task-dates";
import { clientTimezone } from "@/lib/tasks/timezone";

type TaskCreateFormProps = {
  pillars: PillarOption[];
  projects: ProjectOption[];
  sessionStatus: string;
  todayOnly: boolean;
  onTodayOnlyChange: (value: boolean) => void;
  onProjectCreated: (project: ProjectOption) => void;
  onError: (message: string | null) => void;
  onCreated: () => Promise<void>;
};

export function TaskCreateForm({
  pillars,
  projects,
  sessionStatus,
  todayOnly,
  onTodayOnlyChange,
  onProjectCreated,
  onError,
  onCreated,
}: TaskCreateFormProps) {
  const { locale, t } = useLocale();
  const [title, setTitle] = useState("");
  const [newTaskPillarId, setNewTaskPillarId] = useState("");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [newTaskStartAt, setNewTaskStartAt] = useState(() =>
    defaultTaskStartAtInputValue(clientTimezone()),
  );
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
  const [recurrence, setRecurrence] = useState(defaultRecurrenceFormValue);
  const [recurrenceTouched, setRecurrenceTouched] = useState(false);

  const handleAutoRecurrence = useCallback((value: RecurrenceFormValue) => {
    setRecurrence(value);
  }, []);

  const {
    autoClassify,
    analyzing,
    autoLabel,
    recurrenceLabel,
    estimateLabel,
    clearAutoRecurrence,
  } = useTaskTitleAnalysis({
    title,
    pillars,
    newTaskPillarId,
    recurrenceTouched,
    sessionStatus,
    onAutoRecurrence: handleAutoRecurrence,
  });

  const workPillar = useMemo(() => findWorkPillar(pillars), [pillars]);

  useEffect(() => {
    if (newTaskPillarId) return;
    if (autoClassify?.pillarName !== WORK_PILLAR_NAME) {
      setNewTaskProjectId("");
    }
  }, [autoClassify, newTaskPillarId]);

  const showCreateProjectPicker = useMemo(() => {
    if (!workPillar) return false;
    if (newTaskPillarId) return newTaskPillarId === workPillar.id;
    return autoClassify?.pillarName === WORK_PILLAR_NAME;
  }, [newTaskPillarId, workPillar, autoClassify]);

  function resetForm() {
    setTitle("");
    setNewTaskPillarId("");
    setNewTaskProjectId("");
    setNewTaskStartAt(defaultTaskStartAtInputValue(clientTimezone()));
    setNewTaskDueAt("");
    setRecurrence(defaultRecurrenceFormValue);
    setRecurrenceTouched(false);
    clearAutoRecurrence();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const tz = clientTimezone();
    const startAt = resolveTaskStartAt(newTaskStartAt, tz);
    const dueAt =
      recurrence.recurrenceType === "none"
        ? normalizeTaskDate(newTaskDueAt || null)
        : null;

    if (!isValidTaskDateRange(startAt, dueAt, tz)) {
      onError(t.errors.invalidTaskDateRange);
      return;
    }

    const resolvedPillarId =
      newTaskPillarId ||
      (newTaskProjectId && workPillar ? workPillar.id : undefined);

    try {
      onError(null);
      await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          autoBreakdown: true,
          startAt,
          ...(dueAt ? { dueAt } : {}),
          ...(resolvedPillarId ? { pillarId: resolvedPillarId } : {}),
          ...(newTaskProjectId ? { projectId: newTaskProjectId } : {}),
          ...(recurrenceTouched
            ? recurrence.recurrenceType !== "none"
              ? {
                  recurrenceType: recurrence.recurrenceType,
                  recurrenceDays: recurrenceTypeUsesDays(recurrence.recurrenceType)
                    ? recurrence.recurrenceDays
                    : null,
                  recurrenceCarryOver: recurrence.recurrenceCarryOver,
                }
              : { recurrenceType: "none" }
            : {}),
        }),
      });
      resetForm();
      await onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : t.errors.addTaskFailed);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[12rem] flex-1 rounded-md border border-border px-3 py-2 text-sm"
          placeholder={t.tasks.placeholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {pillars.length > 0 && (
          <select
            className="rounded-md border border-border px-3 py-2 text-sm"
            value={newTaskPillarId}
            onChange={(e) => {
              const value = e.target.value;
              setNewTaskPillarId(value);
              if (!workPillar || value !== workPillar.id) {
                setNewTaskProjectId("");
              }
            }}
            aria-label={t.tasks.categoryOnCreate}
          >
            <option value="">{t.tasks.autoCategory}</option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {translatePillar(p.name, locale)}
              </option>
            ))}
          </select>
        )}
        {showCreateProjectPicker && workPillar && (
          <ProjectSelectWithCreate
            value={newTaskProjectId}
            projects={projects}
            workPillarId={workPillar.id}
            onChange={(projectId) => setNewTaskProjectId(projectId ?? "")}
            onProjectCreated={onProjectCreated}
            onError={onError}
          />
        )}
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm text-white"
        >
          {t.common.add}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <label className="inline-flex items-center gap-1.5">
          <span>{t.taskCard.start}</span>
          <input
            type="datetime-local"
            value={newTaskStartAt}
            max={newTaskDueAt ? `${newTaskDueAt}T23:59` : undefined}
            onChange={(e) => setNewTaskStartAt(e.target.value)}
            className="rounded-md border border-border px-2 py-1 text-xs text-foreground"
          />
        </label>
        {recurrence.recurrenceType === "none" ? (
          <label className="inline-flex items-center gap-1.5">
            <span>{t.taskCard.due}</span>
            <input
              type="date"
              value={newTaskDueAt}
              min={newTaskStartAt.slice(0, 10) || undefined}
              onChange={(e) => setNewTaskDueAt(e.target.value)}
              className="rounded-md border border-border px-2 py-1 text-xs text-foreground"
            />
          </label>
        ) : (
          <span title={t.taskCard.dueDisabledForRecurrence}>
            {t.taskCard.dueDisabledForRecurrence}
          </span>
        )}
      </div>
      <TaskRecurrenceForm
        value={recurrence}
        onChange={(value) => {
          setRecurrenceTouched(true);
          setRecurrence(value);
          if (value.recurrenceType !== "none") {
            setNewTaskDueAt("");
          }
        }}
        leadingButton={
          <button
            type="button"
            onClick={() => onTodayOnlyChange(!todayOnly)}
            className={`rounded-md border px-2.5 py-1 text-xs ${
              todayOnly
                ? "border-accent bg-accent/10 text-accent"
                : "border-border hover:bg-neutral-50"
            }`}
          >
            {t.today.title}
          </button>
        }
      />
      {title.trim() && (
        <p className="text-xs text-muted">
          {analyzing ? (
            t.tasks.analyzing
          ) : (
            <>
              {newTaskPillarId ? (
                <>
                  {t.tasks.manualOverride}：
                  {translatePillar(
                    pillars.find((p) => p.id === newTaskPillarId)?.name ?? "",
                    locale,
                  )}
                </>
              ) : autoLabel ? (
                <>
                  {t.tasks.autoDetected}：{autoLabel}
                  {autoClassify?.source === "openai"
                    ? ` · ${t.tasks.classifySourceAi}`
                    : autoClassify?.source === "rules"
                      ? ` · ${t.tasks.classifySourceRules}`
                      : null}
                </>
              ) : (
                t.taskCard.uncategorized
              )}
              {recurrenceLabel && <> · {recurrenceLabel}</>}
              {estimateLabel && <> · {estimateLabel}</>}
            </>
          )}
        </p>
      )}
    </form>
  );
}
