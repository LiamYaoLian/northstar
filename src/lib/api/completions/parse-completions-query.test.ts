import { describe, it, expect } from "vitest";
import {
  InvalidCompletionQueryError,
  MAX_COMPLETION_LIMIT,
  parseCompletionsQuery,
  parseCompletionsSummaryQuery,
} from "./parse-completions-query";
import { DEFAULT_TIMEZONE, InvalidTimezoneError } from "@/lib/tasks/timezone";

describe("parseCompletionsQuery", () => {
  it("defaults tz to America/New_York when missing", () => {
    const parsed = parseCompletionsQuery(
      new URLSearchParams("since=2025-01-06&until=2025-01-06"),
    );
    expect(parsed.tz).toBe(DEFAULT_TIMEZONE);
  });

  it("parses since, until, pillarId, and limit", () => {
    const parsed = parseCompletionsQuery(
      new URLSearchParams(
        "since=2025-01-06&until=2025-01-08&pillarId=p-work&limit=50&tz=Asia/Shanghai",
      ),
    );
    expect(parsed).toEqual({
      tz: "Asia/Shanghai",
      since: "2025-01-06",
      until: "2025-01-08",
      pillarId: "p-work",
      limit: 50,
    });
  });

  it("defaults limit to MAX when omitted", () => {
    const parsed = parseCompletionsQuery(
      new URLSearchParams("since=2025-01-06&until=2025-01-06"),
    );
    expect(parsed.limit).toBe(MAX_COMPLETION_LIMIT);
  });

  it("caps limit at MAX_COMPLETION_LIMIT", () => {
    const parsed = parseCompletionsQuery(
      new URLSearchParams("since=2025-01-06&until=2025-01-06&limit=999"),
    );
    expect(parsed.limit).toBe(MAX_COMPLETION_LIMIT);
  });

  it("throws when since or until missing", () => {
    expect(() => parseCompletionsQuery(new URLSearchParams())).toThrow(
      InvalidCompletionQueryError,
    );
    expect(() =>
      parseCompletionsQuery(new URLSearchParams("since=2025-01-06")),
    ).toThrow(InvalidCompletionQueryError);
  });

  it("throws for invalid date format", () => {
    expect(() =>
      parseCompletionsQuery(
        new URLSearchParams("since=2025/01/06&until=2025-01-06"),
      ),
    ).toThrow(InvalidCompletionQueryError);
  });

  it("throws when until is before since", () => {
    expect(() =>
      parseCompletionsQuery(
        new URLSearchParams("since=2025-01-08&until=2025-01-06"),
      ),
    ).toThrow(InvalidCompletionQueryError);
  });

  it("throws InvalidTimezoneError for invalid tz", () => {
    expect(() =>
      parseCompletionsQuery(
        new URLSearchParams("since=2025-01-06&until=2025-01-06&tz=Bad/Zone"),
      ),
    ).toThrow(InvalidTimezoneError);
  });

  it("omits pillarId when not in query (no pillar filter)", () => {
    const parsed = parseCompletionsQuery(
      new URLSearchParams("since=2025-01-06&until=2025-01-06"),
    );
    expect(parsed.pillarId).toBeUndefined();
  });

  it("treats empty pillarId as unassigned-only filter", () => {
    const parsed = parseCompletionsQuery(
      new URLSearchParams("since=2025-01-06&until=2025-01-06&pillarId="),
    );
    expect(parsed.pillarId).toBeNull();
  });
});

describe("parseCompletionsSummaryQuery", () => {
  it("requires since and until", () => {
    const parsed = parseCompletionsSummaryQuery(
      new URLSearchParams("since=2025-01-06&until=2025-01-12"),
    );
    expect(parsed.since).toBe("2025-01-06");
    expect(parsed.until).toBe("2025-01-12");
    expect(parsed.tz).toBe(DEFAULT_TIMEZONE);
  });

  it("throws when until is before since", () => {
    expect(() =>
      parseCompletionsSummaryQuery(
        new URLSearchParams("since=2025-01-12&until=2025-01-06"),
      ),
    ).toThrow(InvalidCompletionQueryError);
  });

  it("throws InvalidTimezoneError for invalid tz", () => {
    expect(() =>
      parseCompletionsSummaryQuery(
        new URLSearchParams("since=2025-01-06&until=2025-01-12&tz=Bad/Zone"),
      ),
    ).toThrow(InvalidTimezoneError);
  });
});
