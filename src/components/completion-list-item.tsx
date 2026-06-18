"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import { localeTag, translatePillar } from "@/lib/i18n/entities";
import type { TaskCompletionEvent } from "@/lib/tasks/completion-events";
import { cn } from "@/lib/utils";

type CompletionListItemProps = {
  event: TaskCompletionEvent;
  className?: string;
};

export function CompletionListItem({ event, className }: CompletionListItemProps) {
  const { locale, t } = useLocale();
  const pillarLabel = event.pillarName
    ? translatePillar(event.pillarName, locale)
    : t.completed.unassigned;
  const completedTime = new Date(event.completedAt).toLocaleTimeString(
    localeTag(locale),
    { hour: "2-digit", minute: "2-digit" },
  );

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <Link href="/tasks" className="font-medium hover:text-accent">
          {event.taskTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: event.pillarColor ?? "#94a3b8" }}
            aria-hidden
          />
          <span>{pillarLabel}</span>
          <span>{completedTime}</span>
        </div>
      </div>
    </div>
  );
}
