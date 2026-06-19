import { useLocale } from "@/lib/i18n/context";
import { translateFocusTrack, translatePillar } from "@/lib/i18n/entities";
import type { PillarOption, TaskWithMeta } from "./types";
import {
  CATEGORY_SELECT_CLASS,
  isWorkPillarOption,
  pillarBadgeStyle,
  pillarSelectStyle,
  resolveSelectedPillar,
} from "./utils";

type TaskCategorySelectProps = {
  task: TaskWithMeta;
  pillars: PillarOption[];
  onChangePillar: (
    taskId: string,
    pillarId: string | null,
    focusTrack?: string | null,
  ) => void;
};

export function TaskCategorySelect({
  task,
  pillars,
  onChangePillar,
}: TaskCategorySelectProps) {
  const { locale, t } = useLocale();
  const selectedPillar = resolveSelectedPillar(task, pillars);
  const focusTracks = selectedPillar?.focusTracks ?? [];

  return (
    <>
      <label className="flex items-center gap-1">
        <span className="sr-only">{t.taskCard.category}</span>
        <select
          className={CATEGORY_SELECT_CLASS}
          style={pillarSelectStyle(selectedPillar)}
          value={task.pillarId ?? ""}
          onChange={(e) =>
            onChangePillar(task.id, e.target.value ? e.target.value : null)
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
      {isWorkPillarOption(selectedPillar) && focusTracks.length > 0 && (
        <label className="flex items-center gap-1">
          <span className="sr-only">{t.taskCard.focusTrack}</span>
          <select
            className={CATEGORY_SELECT_CLASS}
            value={task.focusTrack ?? ""}
            onChange={(e) =>
              onChangePillar(task.id, task.pillarId, e.target.value || null)
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
  );
}

type TaskCategoryBadgeProps = {
  task: TaskWithMeta;
};

export function TaskCategoryBadge({ task }: TaskCategoryBadgeProps) {
  const { locale } = useLocale();
  if (!task.pillarName) return null;

  const pillarLabel = translatePillar(task.pillarName, locale);
  const focusLabel = task.focusTrack
    ? translateFocusTrack(task.focusTrack, locale)
    : undefined;
  const projectLabel = task.projectName;

  return (
    <span
      className="rounded-full px-2 py-0.5"
      style={pillarBadgeStyle(task.pillarColor)}
    >
      {pillarLabel}
      {focusLabel ? ` · ${focusLabel}` : ""}
      {projectLabel ? ` · ${projectLabel}` : ""}
    </span>
  );
}
