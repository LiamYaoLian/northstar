import { clientTimezone } from "@/lib/tasks/timezone";

const TZ_PREFIXES = [
  "/api/tasks",
  "/api/subtasks",
  "/api/completions",
  "/api/reviews",
  "/api/alignment",
  "/api/time-entries",
] as const;

function matchesTzPrefix(url: string): boolean {
  return TZ_PREFIXES.some(
    (prefix) => url === prefix || url.startsWith(`${prefix}?`) || url.startsWith(`${prefix}/`),
  );
}

/** Append tz query param for task/completion API routes. */
export function withAutoTimezone(url: string, tz = clientTimezone()): string {
  if (!matchesTzPrefix(url)) return url;
  try {
    const parsed = new URL(url, "http://local");
    if (!parsed.searchParams.has("tz")) {
      parsed.searchParams.set("tz", tz);
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

export function shouldAutoAppendTimezone(url: string): boolean {
  return matchesTzPrefix(url);
}

export { TZ_PREFIXES };
