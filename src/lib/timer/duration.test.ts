import { describe, expect, it } from "vitest";
import { computeDurationMin } from "./duration";

describe("computeDurationMin", () => {
  it("rounds to at least 1 minute for sub-minute elapsed", () => {
    expect(computeDurationMin(29_000)).toBe(1);
    expect(computeDurationMin(1_000)).toBe(1);
  });

  it("rounds 90 seconds to 2 minutes", () => {
    expect(computeDurationMin(90_000)).toBe(2);
  });

  it("rounds 60 seconds to 1 minute", () => {
    expect(computeDurationMin(60_000)).toBe(1);
  });

  it("rounds 89 seconds to 1 minute", () => {
    expect(computeDurationMin(89_000)).toBe(1);
  });
});
