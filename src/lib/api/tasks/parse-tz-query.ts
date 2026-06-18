import { resolveTimezone, isValidTimezone, InvalidTimezoneError } from "@/lib/tasks/timezone";

/** Parse `tz` query param for task API routes. */
export function parseTzFromSearchParams(
  searchParams: URLSearchParams,
): string {
  const raw = searchParams.get("tz");
  if (raw === null || raw === "") {
    return resolveTimezone(raw);
  }
  if (!isValidTimezone(raw)) {
    throw new InvalidTimezoneError(raw);
  }
  return raw;
}
