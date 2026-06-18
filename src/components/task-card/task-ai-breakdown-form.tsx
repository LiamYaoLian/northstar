import { useLocale } from "@/lib/i18n/context";

type TaskAiBreakdownFormProps = {
  aiPrompt: string;
  breaking: boolean;
  onPromptChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function TaskAiBreakdownForm({
  aiPrompt,
  breaking,
  onPromptChange,
  onSubmit,
}: TaskAiBreakdownFormProps) {
  const { t } = useLocale();

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2 rounded-lg border border-dashed border-border bg-neutral-50 p-3"
    >
      <textarea
        className="min-h-16 w-full rounded-md border border-border px-2 py-1.5 text-sm"
        placeholder={t.taskCard.breakdownPromptPlaceholder}
        value={aiPrompt}
        onChange={(e) => onPromptChange(e.target.value)}
      />
      <button
        type="submit"
        disabled={breaking}
        className="rounded-md bg-accent px-3 py-1 text-xs text-white disabled:opacity-50"
      >
        {breaking ? t.taskCard.breakingDown : t.taskCard.runAiBreakdown}
      </button>
    </form>
  );
}
