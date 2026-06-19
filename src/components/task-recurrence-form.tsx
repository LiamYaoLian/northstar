"use client";

import type { QuarterMonthSlot, RecurrenceType } from "@/lib/tasks/recurrence-types";
import {
  defaultQuarterMonthSlot,
  parseQuarterlyRecurrence,
  serializeQuarterlyRecurrence,
} from "@/lib/tasks/recurrence-types";
import { useLocale } from "@/lib/i18n/context";
import type { ReactNode } from "react";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const QUARTER_MONTH_SLOTS = [1, 2, 3] as const;

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

function defaultMonthDay(): number {
  return new Date().getDate();
}

function defaultQuarterlyDays(): number[] {
  return serializeQuarterlyRecurrence(defaultQuarterMonthSlot(), defaultMonthDay());
}

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
      recurrenceDays:
        recurrenceType === "weekly"
          ? value.recurrenceDays.filter((d) => d >= 1 && d <= 7)
          : recurrenceType === "monthly"
            ? value.recurrenceDays.some((d) => d >= 1 && d <= 31)
              ? value.recurrenceDays.filter((d) => d >= 1 && d <= 31)
              : [defaultMonthDay()]
            : recurrenceType === "quarterly"
              ? (() => {
                  const parsed = parseQuarterlyRecurrence(value.recurrenceDays);
                  return parsed
                    ? serializeQuarterlyRecurrence(
                        parsed.monthInQuarter,
                        parsed.dayOfMonth,
                      )
                    : defaultQuarterlyDays();
                })()
              : [],
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

  function setMonthDay(day: number) {
    onChange({ ...value, recurrenceDays: [day] });
  }

  const quarterlyConfig =
    value.recurrenceType === "quarterly"
      ? parseQuarterlyRecurrence(value.recurrenceDays)
      : null;

  function setQuarterMonth(monthInQuarter: QuarterMonthSlot) {
    const day = quarterlyConfig?.dayOfMonth ?? defaultMonthDay();
    onChange({
      ...value,
      recurrenceDays: serializeQuarterlyRecurrence(monthInQuarter, day),
    });
  }

  function setQuarterDay(day: number) {
    const monthInQuarter = quarterlyConfig?.monthInQuarter ?? defaultQuarterMonthSlot();
    onChange({
      ...value,
      recurrenceDays: serializeQuarterlyRecurrence(monthInQuarter, day),
    });
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap gap-2">
        {leadingButton}
        {(["none", "daily", "weekly", "monthly", "quarterly"] as const).map((type) => (
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

      {value.recurrenceType === "monthly" && (
        <>
          <label className="flex items-center gap-2 text-xs text-muted">
            {t.recurrence.monthDay}
            <select
              value={value.recurrenceDays[0] ?? defaultMonthDay()}
              onChange={(e) => setMonthDay(Number(e.target.value))}
              className="rounded-md border border-border px-2 py-1 text-xs"
            >
              {MONTH_DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted">{t.recurrence.monthDayShortMonthHint}</p>
        </>
      )}

      {value.recurrenceType === "quarterly" && (
        <>
          <label className="flex items-center gap-2 text-xs text-muted">
            {t.recurrence.quarterMonth}
            <select
              value={quarterlyConfig?.monthInQuarter ?? defaultQuarterMonthSlot()}
              onChange={(e) =>
                setQuarterMonth(Number(e.target.value) as QuarterMonthSlot)
              }
              className="rounded-md border border-border px-2 py-1 text-xs"
            >
              {QUARTER_MONTH_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {t.recurrence.quarterMonthSlot(slot)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            {t.recurrence.quarterDay}
            <select
              value={quarterlyConfig?.dayOfMonth ?? defaultMonthDay()}
              onChange={(e) => setQuarterDay(Number(e.target.value))}
              className="rounded-md border border-border px-2 py-1 text-xs"
            >
              {MONTH_DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted">{t.recurrence.quarterDayShortMonthHint}</p>
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
