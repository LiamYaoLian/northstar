"use client";

import { Repeat } from "lucide-react";
import type { Task } from "@/lib/db/schema";
import { useLocale } from "@/lib/i18n/context";
import { localeTag } from "@/lib/i18n/entities";
import { formatRecurrenceFrequency } from "@/lib/tasks/recurrence-label";
import { nextScheduledAfter } from "@/lib/tasks/recurrence";
import { toRecurrenceFields } from "@/lib/tasks/recurrence-types";
import { clientTimezone } from "@/lib/tasks/timezone";
import { cn } from "@/lib/utils";

type TaskRecurrenceBadgeProps = {
  task: Task;
  showWhenNone?: boolean;
  prominent?: boolean;
};

export function TaskRecurrenceBadge({
  task,
  showWhenNone = false,
  prominent = false,
}: TaskRecurrenceBadgeProps) {
  const { locale, t } = useLocale();

  const frequency = formatRecurrenceFrequency(
    task.recurrenceType,
    task.recurrenceDays,
    Boolean(task.recurrenceCarryOver),
    {
      daily: t.recurrence.daily,
      weekly: t.recurrence.weekly,
      monthly: t.recurrence.monthly,
      quarterly: t.recurrence.quarterly,
      yearly: t.recurrence.yearly,
      weeklyOn: t.recurrence.weeklyOn,
      monthlyOn: t.recurrence.monthlyOn,
      quarterlyOn: t.recurrence.quarterlyOn,
      yearlyOn: t.recurrence.yearlyOn,
      carryOverShort: t.recurrence.carryOverShort,
      weekday: t.weekday,
    },
    locale === "zh" ? "、" : ", ",
  );

  if (!frequency && !showWhenNone) return null;

  const now = new Date();
  const tz = clientTimezone();
  const fields = toRecurrenceFields(task);
  const next = frequency ? nextScheduledAfter(fields, now, tz) : null;
  const nextLabel = next
    ? `${t.recurrence.nextOccurrence} ${next.toLocaleDateString(localeTag(locale), {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}`
    : null;

  const label = frequency ?? t.recurrence.none;

  let content: string;
  if (task.status === "done" && frequency) {
    content = [
      label,
      t.recurrence.completedThisCycle,
      nextLabel,
    ]
      .filter(Boolean)
      .join(" · ");
  } else {
    content = [label, nextLabel].filter(Boolean).join(" · ");
  }

  const className = cn(
    "inline-flex items-center gap-1 text-xs",
    prominent
      ? "rounded-md border border-border bg-neutral-50 px-2 py-1 font-medium text-foreground"
      : null,
    !prominent && frequency && task.status === "done"
      ? "text-emerald-700"
      : !prominent && frequency
        ? "text-accent/90"
        : !prominent
          ? "text-muted"
          : frequency
            ? "text-foreground"
            : "text-muted",
  );

  return (
    <span className={className}>
      {prominent && <Repeat className="h-3 w-3 shrink-0 opacity-70" aria-hidden />}
      {content}
    </span>
  );
}
