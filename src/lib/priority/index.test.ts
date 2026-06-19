import { describe, it, expect } from "vitest";
import {
  computeTaskPriority,
  rerankAll,
  suggestFocusTrack,
} from "./index";
import { makeTask, testPillars } from "@/lib/test-fixtures";

describe("computeTaskPriority", () => {
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
      makeTask({ id: "low", intimidationScore: 1 }),
      makeTask({
        id: "high",
        intimidationScore: 4,
        createdAt: "2020-01-01T00:00:00.000Z",
      }),
      makeTask({ id: "done", status: "done" }),
    ];
    const results = rerankAll(tasks, testPillars, [], "进大厂");
    expect(results).toHaveLength(2);
    expect(results[0].rank).toBe(1);
    expect(results[0].taskId).toBe("high");
  });
});
