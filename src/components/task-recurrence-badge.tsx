"use client";

import type { Task } from "@/lib/db/schema";
import { useLocale } from "@/lib/i18n/context";
import { localeTag } from "@/lib/i18n/entities";
import { nextScheduledAfter } from "@/lib/tasks/recurrence";
import { toRecurrenceFields } from "@/lib/tasks/recurrence-types";
import { clientTimezone } from "@/lib/tasks/timezone";

type TaskRecurrenceBadgeProps = {
  task: Task;
};

export function TaskRecurrenceBadge({ task }: TaskRecurrenceBadgeProps) {
  const { locale, t } = useLocale();

  if (task.recurrenceType === "none") return null;

  const label =
    task.recurrenceType === "daily"
      ? t.recurrence.daily
      : t.recurrence.weekly;

  const now = new Date();
  const tz = clientTimezone();
  const fields = toRecurrenceFields(task);
  const next = nextScheduledAfter(fields, now, tz);

  if (task.status === "done") {
    return (
      <span className="text-emerald-700">
        {t.recurrence.completedThisCycle}
        {next
          ? ` · ${t.recurrence.nextOccurrence} ${next.toLocaleDateString(localeTag(locale), {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}`
          : null}
      </span>
    );
  }

  return (
    <span className="text-muted">
      {label}
      {next
        ? ` · ${t.recurrence.nextOccurrence} ${next.toLocaleDateString(localeTag(locale), {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}`
        : null}
    </span>
  );
}
