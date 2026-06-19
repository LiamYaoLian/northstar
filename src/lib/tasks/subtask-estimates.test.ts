import { describe, it, expect } from "vitest";
import {
  resolveTaskEstimatedMin,
  sumSubtaskEstimatedMin,
} from "./subtask-estimates";

describe("subtask-estimates", () => {
  it("sums subtask estimated minutes", () => {
    expect(
      sumSubtaskEstimatedMin([
        { estimatedMin: 10 },
        { estimatedMin: 25 },
        { estimatedMin: null },
      ]),
    ).toBe(35);
  });

  it("uses subtask sum when subtasks exist", () => {
    expect(
      resolveTaskEstimatedMin(90, [
        { estimatedMin: 10 },
        { estimatedMin: 20 },
      ]),
    ).toBe(30);
  });

  it("falls back to task estimate when subtasks have no estimates", () => {
    expect(
      resolveTaskEstimatedMin(90, [{ estimatedMin: null }, { estimatedMin: null }]),
    ).toBe(90);
  });
});
