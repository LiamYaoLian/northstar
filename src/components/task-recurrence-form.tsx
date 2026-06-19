"use client";

import type { RecurrenceType } from "@/lib/tasks/recurrence-types";
import { useLocale } from "@/lib/i18n/context";
import type { ReactNode } from "react";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export type RecurrenceFormValue = {
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
  recurrenceCarryOver: boolean;
};

type TaskRecurrenceFormProps = {
  value: RecurrenceFormValue;
  onChange: (value: RecurrenceFormValue) => void;
  compact?: boolean;
  leadingButton?: ReactNode;
};

export function TaskRecurrenceForm({
  value,
  onChange,
  compact = false,
  leadingButton,
}: TaskRecurrenceFormProps) {
  const { t } = useLocale();

  function setType(recurrenceType: RecurrenceType) {
    onChange({
      recurrenceType,
      recurrenceDays: recurrenceType === "weekly" ? value.recurrenceDays : [],
      recurrenceCarryOver:
        recurrenceType === "weekly" ? value.recurrenceCarryOver : false,
    });
  }

  function toggleDay(day: number) {
    const days = value.recurrenceDays.includes(day)
      ? value.recurrenceDays.filter((d) => d !== day)
      : [...value.recurrenceDays, day].sort((a, b) => a - b);
    onChange({ ...value, recurrenceDays: days });
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap gap-2">
        {leadingButton}
        {(["none", "daily", "weekly"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setType(type)}
            className={`rounded-md border px-2.5 py-1 text-xs ${
              value.recurrenceType === type
                ? "border-accent bg-accent/10 text-accent"
                : "border-border hover:bg-neutral-50"
            }`}
          >
            {t.recurrence[type]}
          </button>
        ))}
      </div>

      {value.recurrenceType === "weekly" && (
        <>
          <div className="flex flex-wrap gap-1">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded border px-2 py-0.5 text-xs ${
                  value.recurrenceDays.includes(day)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:bg-neutral-50"
                }`}
              >
                {t.weekday[day]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={value.recurrenceCarryOver}
              onChange={(e) =>
                onChange({ ...value, recurrenceCarryOver: e.target.checked })
              }
            />
            {t.recurrence.carryOver}
          </label>
          <p className="text-xs text-muted">{t.recurrence.carryOverWeeklyOnly}</p>
        </>
      )}

      {value.recurrenceType === "daily" && (
        <p className="text-xs text-muted">{t.recurrence.carryOverWeeklyOnly}</p>
      )}
    </div>
  );
}

export const defaultRecurrenceFormValue: RecurrenceFormValue = {
  recurrenceType: "none",
  recurrenceDays: [],
  recurrenceCarryOver: false,
};
