"use client";

import { useState } from "react";
import { useTimer } from "@/components/timer-provider";
import { useLocale } from "@/lib/i18n/context";
import { POMODORO_PRESETS } from "@/lib/timer/elapsed";
import { cn } from "@/lib/utils";
import type { TaskWithMeta } from "./types";
import { getDefaultLogMinutes, isTaskIntimidating } from "./utils";

type TaskActionBarProps = {
  task: TaskWithMeta;
  effectiveEstimatedMin?: number | null;
  showManual: boolean;
  showAiBreakdown: boolean;
  onToggleManual: () => void;
  onToggleAiBreakdown: () => void;
  onToggleWhy: () => void;
  onToggleIntimidating?: (id: string, intimidating: boolean) => void;
  onLogTime?: (id: string, minutes: number) => void;
  onComplete?: (id: string) => void;
  onReopen?: (id: string) => void;
  onDelete?: (id: string) => void;
  onTimerError?: (message: string) => void;
  hasAddSubtask?: boolean;
  hasBreakdown?: boolean;
};

export function TaskActionBar({
  task,
  effectiveEstimatedMin,
  showManual,
  showAiBreakdown,
  onToggleManual,
  onToggleAiBreakdown,
  onToggleWhy,
  onToggleIntimidating,
  onLogTime,
  onComplete,
  onReopen,
  onDelete,
  onTimerError,
  hasAddSubtask,
  hasBreakdown,
}: TaskActionBarProps) {
  const { t } = useLocale();
  const {
    active,
    displayLabel,
    overtime,
    busy,
    isRunningOnTask,
    otherRunningTaskTitle,
    startStopwatch,
    startPomodoro,
    stop,
    cancel,
  } = useTimer();
  const [pomodoroMin, setPomodoroMin] = useState<number>(25);
  const intimidating = isTaskIntimidating(task.intimidationScore);
  const runningHere = isRunningOnTask(task.id);
  const runningElsewhere = Boolean(active && !runningHere);
  const timerDisabled = runningElsewhere || busy;

  async function runTimerAction(action: () => Promise<void>) {
    try {
      await action();
    } catch (err) {
      onTimerError?.(err instanceof Error ? err.message : t.errors.startTimerFailed);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    try {
      if (runningHere) {
        await cancel();
      }
      onDelete(task.id);
    } catch (err) {
      onTimerError?.(err instanceof Error ? err.message : t.errors.cancelTimerFailed);
    }
  }

  return (
    <div className="space-y-2">
      {runningHere && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 text-xs",
            overtime
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-accent/30 bg-accent/5",
          )}
        >
          <span className="font-mono tabular-nums">{displayLabel}</span>
          {overtime && <span>{t.timer.overtime}</span>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void runTimerAction(stop)}
            className="rounded-md bg-accent px-2 py-1 text-white hover:opacity-90 disabled:opacity-50"
          >
            {t.timer.stop}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runTimerAction(cancel)}
            className="rounded-md border border-border px-2 py-1 hover:bg-neutral-50 disabled:opacity-50"
          >
            {t.timer.cancel}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {hasAddSubtask && (
          <ActionButton onClick={onToggleManual}>
            {showManual ? t.taskCard.collapseBreakdown : t.taskCard.manualBreakdown}
          </ActionButton>
        )}
        {hasBreakdown && (
          <ActionButton onClick={onToggleAiBreakdown}>
            {showAiBreakdown
              ? t.taskCard.collapseAiBreakdown
              : t.taskCard.aiBreakdown}
          </ActionButton>
        )}
        <ActionButton onClick={onToggleWhy}>{t.taskCard.whyRanked}</ActionButton>
        {onToggleIntimidating && (
          <button
            type="button"
            onClick={() => onToggleIntimidating(task.id, !intimidating)}
            className={`rounded-md border px-2 py-1 text-xs hover:bg-neutral-50 ${
              intimidating
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-border"
            }`}
          >
            {intimidating
              ? t.taskCard.unmarkIntimidating
              : t.taskCard.markIntimidating}
          </button>
        )}

        {!runningHere && (
          <>
            <button
              type="button"
              disabled={timerDisabled}
              title={
                runningElsewhere && otherRunningTaskTitle
                  ? t.timer.runningOnOtherTask.replace("{title}", otherRunningTaskTitle)
                  : undefined
              }
              onClick={() => void runTimerAction(() => startStopwatch(task.id))}
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.timer.start}
            </button>
            <div className="flex items-center gap-1">
              <select
                value={pomodoroMin}
                disabled={timerDisabled}
                onChange={(e) => setPomodoroMin(Number(e.target.value))}
                className="rounded-md border border-border px-1 py-1 text-xs disabled:opacity-50"
                aria-label={t.timer.pomodoro}
              >
                {POMODORO_PRESETS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes}m
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={timerDisabled}
                title={
                  runningElsewhere && otherRunningTaskTitle
                    ? t.timer.runningOnOtherTask.replace("{title}", otherRunningTaskTitle)
                    : undefined
                }
                onClick={() =>
                  void runTimerAction(() => startPomodoro(task.id, pomodoroMin))
                }
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t.timer.pomodoro}
              </button>
            </div>
          </>
        )}

        {onLogTime && (
          <button
            type="button"
            onClick={() =>
              onLogTime(
                task.id,
                getDefaultLogMinutes(effectiveEstimatedMin ?? task.estimatedMin),
              )
            }
            className="rounded-md bg-accent px-2 py-1 text-xs text-white hover:opacity-90"
          >
            {t.taskCard.logTime}
          </button>
        )}
        {onComplete && task.status !== "done" && (
          <ActionButton onClick={() => onComplete(task.id)}>
            {t.taskCard.complete}
          </ActionButton>
        )}
        {onReopen && task.status === "done" && (
          <ActionButton onClick={() => onReopen(task.id)}>
            {t.taskCard.reopen}
          </ActionButton>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            {t.taskCard.deleteTask}
          </button>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-neutral-50"
    >
      {children}
    </button>
  );
}
