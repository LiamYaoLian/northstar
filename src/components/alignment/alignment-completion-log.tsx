import { CategoryFilter } from "@/components/category-filter";
import { CompletionListItem } from "@/components/completion-list-item";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { localeTag } from "@/lib/i18n/entities";
import {
  groupCompletionEventsByDate,
  type TaskCompletionEvent,
} from "@/lib/tasks/completion-events";
import type { PillarOption } from "@/lib/tasks/enrich-tasks";

type AlignmentCompletionLogProps = {
  events: TaskCompletionEvent[];
  pillars: PillarOption[];
  categoryFilter: string | null;
  onCategoryFilterChange: (pillarId: string | null) => void;
};

export function AlignmentCompletionLog({
  events,
  pillars,
  categoryFilter,
  onCategoryFilterChange,
}: AlignmentCompletionLogProps) {
  const { locale, t } = useLocale();
  const groups = groupCompletionEventsByDate(events);

  return (
    <section id="completions" className="scroll-mt-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t.completed.title}</h3>
        <p className="text-sm text-muted">{t.alignment.didVsLogged}</p>
      </div>

      <CategoryFilter
        pillars={pillars}
        selectedPillarId={categoryFilter}
        onChange={onCategoryFilterChange}
      />

      {groups.length === 0 ? (
        <p className="text-sm text-muted">{t.completed.empty}</p>
      ) : (
        groups.map((group) => (
          <Card key={group.date} className="space-y-2">
            <h4 className="text-sm font-medium text-muted">
              {t.completed.groupDate.replace(
                "{date}",
                new Date(`${group.date}T12:00:00`).toLocaleDateString(
                  localeTag(locale),
                  { weekday: "short", month: "short", day: "numeric" },
                ),
              )}
            </h4>
            <div className="space-y-2">
              {group.events.map((event) => (
                <CompletionListItem key={event.id} event={event} />
              ))}
            </div>
          </Card>
        ))
      )}
    </section>
  );
}
