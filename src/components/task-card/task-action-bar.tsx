import { useLocale } from "@/lib/i18n/context";
import type { TaskWithMeta } from "./types";
import { getDefaultLogMinutes, isTaskIntimidating } from "./utils";

type TaskActionBarProps = {
  task: TaskWithMeta;
  showManual: boolean;
  showAiBreakdown: boolean;
  onToggleManual: () => void;
  onToggleAiBreakdown: () => void;
  onToggleWhy: () => void;
  onPin?: (id: string, pinned: boolean) => void;
  onToggleIntimidating?: (id: string, intimidating: boolean) => void;
  onLogTime?: (id: string, minutes: number) => void;
  onComplete?: (id: string) => void;
  hasAddSubtask?: boolean;
  hasBreakdown?: boolean;
};

export function TaskActionBar({
  task,
  showManual,
  showAiBreakdown,
  onToggleManual,
  onToggleAiBreakdown,
  onToggleWhy,
  onPin,
  onToggleIntimidating,
  onLogTime,
  onComplete,
  hasAddSubtask,
  hasBreakdown,
}: TaskActionBarProps) {
  const { t } = useLocale();
  const intimidating = isTaskIntimidating(task.intimidationScore);

  return (
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
      {onPin && (
        <ActionButton onClick={() => onPin(task.id, !task.isPinned)}>
          {task.isPinned ? t.taskCard.unpin : t.taskCard.pin}
        </ActionButton>
      )}
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
      {onLogTime && (
        <button
          type="button"
          onClick={() => onLogTime(task.id, getDefaultLogMinutes(task.estimatedMin))}
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
