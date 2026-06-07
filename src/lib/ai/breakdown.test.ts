import { describe, it, expect } from "vitest";
import { ruleBasedBreakdown, shouldAutoBreakdown } from "./breakdown";

describe("ruleBasedBreakdown", () => {
  it("breaks down leetcode tasks with entry point", () => {
    const result = ruleBasedBreakdown("刷 LC 题");
    expect(result.subtasks.length).toBeGreaterThanOrEqual(3);
    expect(result.subtasks[0].isEntryPoint).toBe(true);
    expect(result.subtasks[0].estimatedMin).toBeLessThanOrEqual(2);
  });

  it("breaks down investor deck", () => {
    const result = ruleBasedBreakdown("准备投资人 deck");
    expect(result.subtasks.some((s) => s.title.includes("大纲") || s.title.includes("信息"))).toBe(true);
    expect(result.intimidationScore).toBeGreaterThanOrEqual(3);
  });

  it("generic breakdown for unknown tasks", () => {
    const result = ruleBasedBreakdown("整理衣柜");
    expect(result.subtasks).toHaveLength(4);
    expect(result.subtasks[0].isEntryPoint).toBe(true);
  });
});

describe("shouldAutoBreakdown", () => {
  it("triggers for complex titles", () => {
    expect(shouldAutoBreakdown("准备投资人 deck")).toBe(true);
    expect(shouldAutoBreakdown("买菜")).toBe(false);
  });

  it("triggers for high intimidation", () => {
    expect(shouldAutoBreakdown("买菜", 4)).toBe(true);
  });
});
