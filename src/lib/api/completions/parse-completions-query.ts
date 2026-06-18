import {
  DEFAULT_TIMEZONE,
  InvalidTimezoneError,
  resolveTimezone,
} from "@/lib/tasks/timezone";

export class InvalidCompletionQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCompletionQueryError";
  }
}

export const MAX_COMPLETION_LIMIT = 200;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ParsedCompletionsQuery = {
  tz: string;
  since: string;
  until: string;
  /** undefined = no pillar filter; null = unassigned only; string = that pillar */
  pillarId?: string | null;
  limit: number;
};

function parseDateParam(value: string | null, name: string): string {
  if (!value || !DATE_RE.test(value)) {
    throw new InvalidCompletionQueryError(`Invalid or missing ${name}`);
  }
  return value;
}

function parseTz(searchParams: URLSearchParams): string {
  try {
    return resolveTimezone(searchParams.get("tz"));
  } catch (err) {
    if (err instanceof InvalidTimezoneError) throw err;
    throw new InvalidCompletionQueryError("Invalid timezone");
  }
}

function parseSinceUntil(searchParams: URLSearchParams): {
  since: string;
  until: string;
} {
  const since = parseDateParam(searchParams.get("since"), "since");
  const until = parseDateParam(searchParams.get("until"), "until");
  if (until < since) {
    throw new InvalidCompletionQueryError("until must be on or after since");
  }
  return { since, until };
}

export function parseCompletionsQuery(
  searchParams: URLSearchParams,
): ParsedCompletionsQuery {
  const tz = parseTz(searchParams);
  const { since, until } = parseSinceUntil(searchParams);
  let pillarId: string | null | undefined = undefined;
  if (searchParams.has("pillarId")) {
    const pillarRaw = searchParams.get("pillarId");
    pillarId = pillarRaw && pillarRaw.length > 0 ? pillarRaw : null;
  }
  const limitRaw = searchParams.get("limit");
  let limit = MAX_COMPLETION_LIMIT;
  if (limitRaw != null && limitRaw !== "") {
    const parsed = Number.parseInt(limitRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new InvalidCompletionQueryError("Invalid limit");
    }
    limit = Math.min(parsed, MAX_COMPLETION_LIMIT);
  }
  return { tz, since, until, pillarId, limit };
}

export function parseCompletionsSummaryQuery(
  searchParams: URLSearchParams,
): Omit<ParsedCompletionsQuery, "pillarId" | "limit"> {
  const tz = parseTz(searchParams);
  const { since, until } = parseSinceUntil(searchParams);
  return { tz, since, until };
}

export { DEFAULT_TIMEZONE };
