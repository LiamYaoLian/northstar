export const DEFAULT_TIMEZONE = "America/New_York";

export class InvalidTimezoneError extends Error {
  constructor(tz: string) {
    super(`Invalid timezone: ${tz}`);
    this.name = "InvalidTimezoneError";
  }
}

export function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimezone(tz: string | null | undefined): string {
  if (tz === null || tz === undefined || tz === "") {
    return DEFAULT_TIMEZONE;
  }
  if (!isValidTimezone(tz)) {
    throw new InvalidTimezoneError(tz);
  }
  return tz;
}

export function clientTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && isValidTimezone(tz)) return tz;
  } catch {
    // fall through
  }
  return DEFAULT_TIMEZONE;
}

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getLocalParts(instant: Date, tz: string): LocalParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  tz: string,
): Date {
  let guess = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i++) {
    const local = getLocalParts(new Date(guess), tz);
    const desired = Date.UTC(year, month - 1, day, hour, minute, second);
    const actual = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    guess += desired - actual;
  }
  return new Date(guess);
}

const ISO_WEEKDAY: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function isoWeekdayInTz(instant: Date, tz: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(instant);
  return ISO_WEEKDAY[weekday] ?? 1;
}

export function startOfLocalDay(instant: Date, tz: string): Date {
  const { year, month, day } = getLocalParts(instant, tz);
  return zonedTimeToUtc(year, month, day, 0, 0, 0, tz);
}

export function endOfLocalDay(instant: Date, tz: string): Date {
  const nextDay = addLocalDays(instant, tz, 1);
  return new Date(startOfLocalDay(nextDay, tz).getTime() - 1);
}

export function addLocalDays(instant: Date, tz: string, days: number): Date {
  const local = getLocalParts(instant, tz);
  const noonUtc = zonedTimeToUtc(local.year, local.month, local.day, 12, 0, 0, tz);
  const shifted = new Date(noonUtc);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  const target = getLocalParts(shifted, tz);
  return zonedTimeToUtc(
    target.year,
    target.month,
    target.day,
    local.hour,
    local.minute,
    local.second,
    tz,
  );
}

export function localDateString(instant: Date, tz: string): string {
  const { year, month, day } = getLocalParts(instant, tz);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Monday 00:00 local in tz. */
export function startOfLocalWeek(instant: Date, tz: string): Date {
  const weekday = isoWeekdayInTz(instant, tz);
  const monday = addLocalDays(instant, tz, -(weekday - 1));
  return startOfLocalDay(monday, tz);
}
