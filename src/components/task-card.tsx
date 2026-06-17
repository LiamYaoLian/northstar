"use client";

import { useState } from "react";
import { SortableSubtasks } from "@/components/sortable-subtasks";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { translateFocusTrack, translatePillar } from "@/lib/i18n/entities";
import { parseJson } from "@/lib/utils";
import type { Task, Subtask, PriorityFactors, FocusTrack } from "@/lib/db/schema";

export type PillarOption = {
  id: string;
  name: string;
  color: string;
  focusTracks?: FocusTrack[];
};

type TaskWithMeta = Task & {
  pillarName?: string;
  pillarColor?: string;
  subtasks?: Subtask[];
};

export function TaskCard({
  task,
  rank,
  pillars,
  onPin,
  onComplete,
  onLogTime,
  onBreakdown,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onReorderSubtasks,
  onToggleIntimidating,
  onChangePillar,
}: {
  task: TaskWithMeta;
  rank?: number;
  pillars?: PillarOption[];
  onPin?: (id: string, pinned: boolean) => void;
  onToggleIntimidating?: (id: string, intimidating: boolean) => void;
  onComplete?: (id: string) => void;
  onLogTime?: (id: string, minutes: number) => void;
  onBreakdown?: (id: string, userPrompt?: string) => Promise<void>;
  onToggleSubtask?: (subtaskId: string, isDone: boolean) => void;
  onAddSubtask?: (
    taskId: string,
    title: string,
    isEntryPoint: boolean,
  ) => Promise<void>;
  onDeleteSubtask?: (subtaskId: string) => void;
  onReorderSubtasks?: (
    taskId: string,
    orderedIds: string[],
  ) => Promise<void>;
  onChangePillar?: (
    taskId: string,
    pillarId: string | null,
    focusTrack?: string | null,
  ) => void;
}) {
  const { locale, localeTag, t } = useLocale();
  const [showWhy, setShowWhy] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showAiBreakdown, setShowAiBreakdown] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [asEntryPoint, setAsEntryPoint] = useState(false);
  const [adding, setAdding] = useState(false);
  const factors = parseJson<PriorityFactors | null>(task.priorityFactors, null);
  const subtaskList = task.subtasks ?? [];
  const doneCount = subtaskList.filter((s) => s.isDone).length;
  const isIntimidating = task.intimidationScore >= 4;

  const selectedPillar =
    pillars?.find((p) => p.id === task.pillarId) ??
    (task.pillarName
      ? {
          id: task.pillarId ?? "",
          name: task.pillarName,
          color: task.pillarColor ?? "#6b7280",
          focusTracks: [] as FocusTrack[],
        }
      : undefined);
  const isWorkPillar = selectedPillar?.name === "工作";
  const focusTracks = selectedPillar?.focusTracks ?? [];

  async function handleBreakdown(e: React.FormEvent) {
    e.preventDefault();
    if (!onBreakdown) return;
    setBreaking(true);
    try {
      await onBreakdown(task.id, aiPrompt.trim() || undefined);
      setAiPrompt("");
      setShowAiBreakdown(false);
    } catch {
      // parent shows error banner
    } finally {
      setBreaking(false);
    }
  }

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!onAddSubtask || !subtaskTitle.trim()) return;
    setAdding(true);
    try {
      await onAddSubtask(task.id, subtaskTitle.trim(), asEntryPoint);
      setSubtaskTitle("");
      setAsEntryPoint(false);
    } catch {
      // parent shows error banner
    } finally {
      setAdding(false);
    }
  }

  const pillarLabel = task.pillarName
    ? translatePillar(task.pillarName, locale)
    : undefined;
  const focusLabel = task.focusTrack
    ? translateFocusTrack(task.focusTrack, locale)
    : undefined;

  const categorySelectClass =
    "rounded-full border bg-white px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-accent";

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {rank != null && (
            <span className="text-xs font-medium text-muted">#{rank}</span>
          )}
          <h3 className="font-medium leading-snug">
            {task.isPinned && <span className="mr-1">📌</span>}
            {task.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            {pillars && onChangePillar ? (
              <>
                <label className="flex items-center gap-1">
                  <span className="sr-only">{t.taskCard.category}</span>
                  <select
                    className={categorySelectClass}
                    style={
                      selectedPillar
                        ? {
                            borderColor: selectedPillar.color,
                            color: selectedPillar.color,
                          }
                        : undefined
                    }
                    value={task.pillarId ?? ""}
                    onChange={(e) =>
                      onChangePillar(
                        task.id,
                        e.target.value ? e.target.value : null,
                      )
                    }
                  >
                    <option value="">{t.taskCard.uncategorized}</option>
                    {pillars.map((p) => (
                      <option key={p.id} value={p.id}>
                        {translatePillar(p.name, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                {isWorkPillar && focusTracks.length > 0 && (
                  <label className="flex items-center gap-1">
                    <span className="sr-only">{t.taskCard.focusTrack}</span>
                    <select
                      className={categorySelectClass}
                      value={task.focusTrack ?? ""}
                      onChange={(e) =>
                        onChangePillar(
                          task.id,
                          task.pillarId,
                          e.target.value || null,
                        )
                      }
                    >
                      <option value="">—</option>
                      {focusTracks.map((track) => (
                        <option key={track.name} value={track.name}>
                          {translateFocusTrack(track.name, locale)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            ) : (
              pillarLabel && (
                <span
                  className="rounded-full px-2 py-0.5"
                  style={{
                    backgroundColor: `${task.pillarColor}22`,
                    color: task.pillarColor,
                  }}
                >
                  {pillarLabel}
                  {focusLabel ? ` · ${focusLabel}` : ""}
                </span>
              )
            )}
            {task.estimatedMin && (
              <span>
                {t.taskCard.estMin} {task.estimatedMin}min
              </span>
            )}
            {subtaskList.length > 0 && (
              <span>
                {t.taskCard.subtasks} {doneCount}/{subtaskList.length}
              </span>
            )}
            {task.dueAt && (
              <span>
                {t.taskCard.due}{" "}
                {new Date(task.dueAt).toLocaleDateString(localeTag)}
              </span>
            )}
            {isIntimidating && (
              <span className="text-amber-600">{t.taskCard.intimidating}</span>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-muted">
          {t.taskCard.priority} {(task.priorityScore * 100).toFixed(0)}
        </div>
      </div>

      {subtaskList.length > 0 && onReorderSubtasks && (
        <SortableSubtasks
          taskId={task.id}
          subtasks={subtaskList}
          onReorder={onReorderSubtasks}
          onToggle={onToggleSubtask}
          onDelete={onDeleteSubtask}
        />
      )}

      {showAiBreakdown && onBreakdown && (
        <form
          onSubmit={handleBreakdown}
          className="space-y-2 rounded-lg border border-dashed border-border bg-neutral-50 p-3"
        >
          <textarea
            className="min-h-16 w-full rounded-md border border-border px-2 py-1.5 text-sm"
            placeholder={t.taskCard.breakdownPromptPlaceholder}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
          />
          <button
            type="submit"
            disabled={breaking}
            className="rounded-md bg-accent px-3 py-1 text-xs text-white disabled:opacity-50"
          >
            {breaking ? t.taskCard.breakingDown : t.taskCard.runAiBreakdown}
          </button>
        </form>
      )}

      {showManual && onAddSubtask && (
        <form
          onSubmit={handleAddSubtask}
          className="space-y-2 rounded-lg border border-dashed border-border bg-neutral-50 p-3"
        >
          <input
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            placeholder={t.taskCard.subtaskPlaceholder}
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={asEntryPoint}
              onChange={(e) => setAsEntryPoint(e.target.checked)}
            />
            {t.taskCard.entryPoint}
          </label>
          <button
            type="submit"
            disabled={adding || !subtaskTitle.trim()}
            className="rounded-md bg-accent px-3 py-1 text-xs text-white disabled:opacity-50"
          >
            {adding ? t.taskCard.addingSubtask : t.taskCard.addSubtask}
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {onAddSubtask && (
          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-neutral-50"
          >
            {showManual ? t.taskCard.collapseBreakdown : t.taskCard.manualBreakdown}
          </button>
        )}
        {onBreakdown && (
          <button
            type="button"
            onClick={() => setShowAiBreakdown(!showAiBreakdown)}
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-neutral-50"
          >
            {showAiBreakdown
              ? t.taskCard.collapseAiBreakdown
              : t.taskCard.aiBreakdown}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowWhy(!showWhy)}
          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-neutral-50"
        >
          {t.taskCard.whyRanked}
        </button>
        {onPin && (
          <button
            type="button"
            onClick={() => onPin(task.id, !task.isPinned)}
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-neutral-50"
          >
            {task.isPinned ? t.taskCard.unpin : t.taskCard.pin}
          </button>
        )}
        {onToggleIntimidating && (
          <button
            type="button"
            onClick={() => onToggleIntimidating(task.id, !isIntimidating)}
            className={`rounded-md border px-2 py-1 text-xs hover:bg-neutral-50 ${
              isIntimidating
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-border"
            }`}
          >
            {isIntimidating
              ? t.taskCard.unmarkIntimidating
              : t.taskCard.markIntimidating}
          </button>
        )}
        {onLogTime && (
          <button
            type="button"
            onClick={() => onLogTime(task.id, task.estimatedMin ?? 30)}
            className="rounded-md bg-accent px-2 py-1 text-xs text-white hover:opacity-90"
          >
            {t.taskCard.logTime}
          </button>
        )}
        {onComplete && task.status !== "done" && (
          <button
            type="button"
            onClick={() => onComplete(task.id)}
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-neutral-50"
          >
            {t.taskCard.complete}
          </button>
        )}
      </div>

      {showWhy && factors && (
        <div className="space-y-1 rounded-lg bg-neutral-50 p-3 text-xs">
          <div>
            {t.taskCard.factorStrategic}:{" "}
            {(factors.strategicUrgency * 100).toFixed(0)}
          </div>
          <div>
            {t.taskCard.factorDeadline}:{" "}
            {(factors.deadlinePressure * 100).toFixed(0)}
          </div>
          <div>
            {t.taskCard.factorIntimidation}:{" "}
            {(factors.intimidationEscalation * 100).toFixed(0)}
          </div>
          <div>
            {t.taskCard.factorStaleness}: {(factors.staleness * 100).toFixed(0)}
          </div>
        </div>
      )}
    </Card>
  );
}
