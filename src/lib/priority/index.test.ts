import { describe, it, expect } from "vitest";
import { boardOrderNeedsScoreSync, priorityScoreFromRank } from "./index";

describe("priorityScoreFromRank", () => {
  it("gives top item the highest score", () => {
    expect(priorityScoreFromRank(0, 5)).toBe(1);
    expect(priorityScoreFromRank(4, 5)).toBe(0.2);
  });

  it("handles single item", () => {
    expect(priorityScoreFromRank(0, 1)).toBe(1);
  });
});

describe("boardOrderNeedsScoreSync", () => {
  it("detects higher item with lower score", () => {
    expect(
      boardOrderNeedsScoreSync([
        { priorityScore: 0.33 },
        { priorityScore: 0.36 },
      ]),
    ).toBe(true);
  });

  it("passes when scores match board order", () => {
    expect(
      boardOrderNeedsScoreSync([
        { priorityScore: 0.75 },
        { priorityScore: 0.5 },
      ]),
    ).toBe(false);
  });
});
