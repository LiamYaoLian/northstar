import { useLocale } from "@/lib/i18n/context";
import type { SubtaskDiffLine } from "@/lib/tasks/subtask-diff";

type TaskBreakdownDiffProps = {
  diff: SubtaskDiffLine[];
  summary?: string;
  applying: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function DiffLine({ line }: { line: SubtaskDiffLine }) {
  if (line.type === "unchanged") {
    return (
      <div className="px-2 py-0.5 text-muted">
        <span className="select-none pr-2 opacity-50"> </span>
        {line.title}
      </div>
    );
  }

  if (line.type === "removed") {
    return (
      <div className="bg-red-50 px-2 py-0.5 text-red-700">
        <span className="select-none pr-2">-</span>
        {line.title}
      </div>
    );
  }

  if (line.type === "added") {
    return (
      <div className="bg-green-50 px-2 py-0.5 text-green-700">
        <span className="select-none pr-2">+</span>
        {line.title}
      </div>
    );
  }

  return (
    <>
      <div className="bg-red-50 px-2 py-0.5 text-red-700">
        <span className="select-none pr-2">-</span>
        {line.from}
      </div>
      <div className="bg-green-50 px-2 py-0.5 text-green-700">
        <span className="select-none pr-2">+</span>
        {line.to}
      </div>
    </>
  );
}

export function TaskBreakdownDiff({
  diff,
  summary,
  applying,
  onConfirm,
  onCancel,
}: TaskBreakdownDiffProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-3 rounded-lg border border-border bg-neutral-50 p-3">
      <div>
        <p className="text-sm font-medium">{t.taskCard.breakdownDiffTitle}</p>
        {summary && <p className="mt-1 text-xs text-muted">{summary}</p>}
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-white font-mono text-sm">
        {diff.map((line, index) => (
          <DiffLine key={`${line.type}-${index}`} line={line} />
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={applying}
          className="rounded-md bg-accent px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          {applying ? t.taskCard.breakdownApplying : t.taskCard.breakdownConfirm}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={applying}
          className="rounded-md border border-border px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {t.taskCard.breakdownCancel}
        </button>
      </div>
    </div>
  );
}
