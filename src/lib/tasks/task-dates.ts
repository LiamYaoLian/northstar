import {
  localDateString,
  localDateTimeInputString,
  localDateTimeInputToIso,
  resolveTimezone,
} from "./timezone";

/** Normalize due-date values to YYYY-MM-DD or null. */
export function normalizeTaskDate(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** Normalize planned start to ISO UTC; accepts date-only or datetime-local input. */
export function normalizeTaskStartAt(
  value: string | null | undefined,
  tz?: string,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const resolvedTz = resolveTimezone(tz);

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return localDateTimeInputToIso(trimmed, resolvedTz);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return localDateTimeInputToIso(`${trimmed}T00:00`, resolvedTz);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/** Default start = now (minute precision) in tz, as ISO UTC. */
export function defaultTaskStartAt(tz?: string): string {
  return new Date().toISOString();
}

/** Default start for datetime-local inputs in tz. */
export function defaultTaskStartAtInputValue(tz?: string): string {
  return localDateTimeInputString(new Date(), resolveTimezone(tz));
}

/** Default missing start to now; preserve explicit values. */
export function resolveTaskStartAt(
  inputStartAt: string | null | undefined,
  tz?: string,
): string {
  return normalizeTaskStartAt(inputStartAt, tz) ?? defaultTaskStartAt(tz);
}

export function taskDateToInputValue(value: string | null | undefined): string {
  const normalized = normalizeTaskDate(value ?? null);
  return normalized ?? "";
}

export function taskStartAtToInputValue(
  value: string | null | undefined,
  tz?: string,
): string {
  const iso = normalizeTaskStartAt(value, tz);
  if (!iso) return "";
  return localDateTimeInputString(new Date(iso), resolveTimezone(tz));
}

export function taskStartAtToDateInputValue(
  value: string | null | undefined,
  tz?: string,
): string {
  const iso = normalizeTaskStartAt(value, tz);
  if (!iso) return "";
  return localDateString(new Date(iso), resolveTimezone(tz));
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

export function formatTaskStartAt(
  value: string | null | undefined,
  localeTag: string,
  tz?: string,
): string | null {
  const iso = normalizeTaskStartAt(value, tz);
  if (!iso) return null;
  return new Date(iso).toLocaleString(localeTag, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function isValidTaskDateRange(
  startAt: string | null | undefined,
  dueAt: string | null | undefined,
  tz?: string,
): boolean {
  const due = normalizeTaskDate(dueAt ?? null);
  const startIso = normalizeTaskStartAt(startAt ?? null, tz);
  if (!due || !startIso) return true;
  const startDate = localDateString(new Date(startIso), resolveTimezone(tz));
  return startDate <= due;
}
