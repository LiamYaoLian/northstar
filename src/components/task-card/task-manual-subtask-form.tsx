import { useLocale } from "@/lib/i18n/context";

type TaskManualSubtaskFormProps = {
  subtaskTitle: string;
  asEntryPoint: boolean;
  adding: boolean;
  onTitleChange: (value: string) => void;
  onEntryPointChange: (checked: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function TaskManualSubtaskForm({
  subtaskTitle,
  asEntryPoint,
  adding,
  onTitleChange,
  onEntryPointChange,
  onSubmit,
}: TaskManualSubtaskFormProps) {
  const { t } = useLocale();

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2 rounded-lg border border-dashed border-border bg-neutral-50 p-3"
    >
      <input
        className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
        placeholder={t.taskCard.subtaskPlaceholder}
        value={subtaskTitle}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={asEntryPoint}
          onChange={(e) => onEntryPointChange(e.target.checked)}
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
  );
}
