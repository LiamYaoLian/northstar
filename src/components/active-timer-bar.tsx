"use client";

import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { useTimer } from "@/components/timer-provider";

export function ActiveTimerBar() {
  const { t } = useLocale();
  const {
    active,
    displayLabel,
    overtime,
    busy,
    stop,
    cancel,
  } = useTimer();

  if (!active) return null;

  const title = active.task?.title ?? t.timer.orphanTask;

  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
        overtime
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-accent/30 bg-accent/5",
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        <p className="font-mono text-xs tabular-nums">
          {displayLabel}
          {overtime ? ` · ${t.timer.overtime}` : null}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void stop().catch(() => {})}
          className="rounded-md bg-accent px-2 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
        >
          {t.timer.stop}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void cancel().catch(() => {})}
          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50"
        >
          {t.timer.cancel}
        </button>
      </div>
    </div>
  );
}
