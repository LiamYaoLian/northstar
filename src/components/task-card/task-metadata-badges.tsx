import { useLocale } from "@/lib/i18n/context";
import type { Subtask } from "@/lib/db/schema";
import { getSubtaskProgress, isTaskIntimidating } from "./utils";

type TaskMetadataBadgesProps = {
  estimatedMin: number | null;
  dueAt: string | null;
  intimidationScore: number;
  subtasks: Subtask[];
};

export function TaskMetadataBadges({
  estimatedMin,
  dueAt,
  intimidationScore,
  subtasks,
}: TaskMetadataBadgesProps) {
  const { localeTag, t } = useLocale();
  const { done, total } = getSubtaskProgress(subtasks);
  const intimidating = isTaskIntimidating(intimidationScore);

  return (
    <>
      {estimatedMin != null && (
        <span>
          {t.taskCard.estMin} {estimatedMin}min
        </span>
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
