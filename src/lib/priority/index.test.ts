import { describe, it, expect } from "vitest";
import {
  boardOrderNeedsScoreSync,
  computeTaskPriority,
  priorityScoreFromRank,
  rerankAll,
  suggestFocusTrack,
} from "./index";
import { makeTask, testPillars } from "@/lib/test-fixtures";

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

describe("computeTaskPriority", () => {
  it("returns max score for pinned tasks", () => {
    const result = computeTaskPriority(
      makeTask({ isPinned: true }),
      testPillars,
      new Map(),
      0,
      "进大厂",
      [],
    );
    expect(result.score).toBe(1);
    expect(result.reason).toBe("已置顶");
  });

  it("increases score for overdue deadlines", () => {
    const result = computeTaskPriority(
      makeTask({ dueAt: "2020-01-01T00:00:00.000Z" }),
      testPillars,
      new Map([["p-work", -10]]),
      0,
      "进大厂",
      [],
      new Date("2026-06-01T00:00:00.000Z"),
    );
    expect(result.factors.deadlinePressure).toBe(1);
  });
});

describe("suggestFocusTrack", () => {
  it("maps interview prep to big tech track", () => {
    expect(suggestFocusTrack("Behavior question prep", testPillars[0])).toBe(
      "进大厂",
    );
  });

  it("maps research tasks to explore track", () => {
    expect(suggestFocusTrack("调研创业方向", testPillars[0])).toBe("探索方向");
  });
});

describe("rerankAll", () => {
  it("ranks active tasks by score and assigns ranks", () => {
    const tasks = [
      makeTask({ id: "low", priorityScore: 0.1, intimidationScore: 1 }),
      makeTask({
        id: "high",
        priorityScore: 0.1,
        intimidationScore: 4,
        createdAt: "2020-01-01T00:00:00.000Z",
      }),
      makeTask({ id: "done", status: "done", priorityScore: 1 }),
    ];
    const results = rerankAll(tasks, testPillars, [], "进大厂");
    expect(results).toHaveLength(2);
    expect(results[0].rank).toBe(1);
    expect(results[0].taskId).toBe("high");
  });
});
