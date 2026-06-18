import { describe, it, expect } from "vitest";
import {
  DEFAULT_TIMEZONE,
  InvalidTimezoneError,
} from "@/lib/tasks/timezone";
import { parseTzFromSearchParams } from "./parse-tz-query";

describe("parseTzFromSearchParams", () => {
  it("defaults to America/New_York when tz query is missing", () => {
    expect(parseTzFromSearchParams(new URLSearchParams())).toBe(
      DEFAULT_TIMEZONE,
    );
    expect(parseTzFromSearchParams(new URLSearchParams("sort=manual"))).toBe(
      DEFAULT_TIMEZONE,
    );
  });

  it("returns valid tz unchanged", () => {
    expect(
      parseTzFromSearchParams(new URLSearchParams("tz=Asia/Shanghai")),
    ).toBe("Asia/Shanghai");
  });

  it("throws InvalidTimezoneError for invalid tz", () => {
    expect(() =>
      parseTzFromSearchParams(new URLSearchParams("tz=Foo/Bar")),
    ).toThrow(InvalidTimezoneError);
  });
});
