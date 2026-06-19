import { localDateString, resolveTimezone } from "./timezone";

/** Normalize API / date-input values to YYYY-MM-DD or null. */
export function normalizeTaskDate(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** Calendar today in the given timezone as YYYY-MM-DD. */
export function todayTaskDate(tz?: string): string {
  return localDateString(new Date(), resolveTimezone(tz));
}

/** Default missing start dates to today; preserve explicit values. */
export function resolveTaskStartAt(
  inputStartAt: string | null | undefined,
  tz?: string,
): string {
  return normalizeTaskDate(inputStartAt) ?? todayTaskDate(tz);
}

export function taskDateToInputValue(value: string | null | undefined): string {
  const normalized = normalizeTaskDate(value ?? null);
  return normalized ?? "";
}

export function formatTaskDate(
  value: string | null | undefined,
  localeTag: string,
): string | null {
  const normalized = normalizeTaskDate(value ?? null);
  if (!normalized) return null;
  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(localeTag);
}

export function isValidTaskDateRange(
  startAt: string | null | undefined,
  dueAt: string | null | undefined,
): boolean {
  const start = normalizeTaskDate(startAt ?? null);
  const due = normalizeTaskDate(dueAt ?? null);
  if (!start || !due) return true;
  return start <= due;
}
