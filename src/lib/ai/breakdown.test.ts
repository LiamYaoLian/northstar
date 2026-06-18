import { describe, it, expect } from "vitest";
import {
  ruleBasedBreakdown,
  shouldAutoBreakdown,
  promptDrivenBreakdown,
  AMAZON_LEADERSHIP_PRINCIPLES,
} from "./breakdown";

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

  it("uses description for template matching", () => {
    const result = ruleBasedBreakdown("本周练习", "重点是 leetcode 动态规划");
    expect(result.subtasks.some((s) => /题|样例|复盘/.test(s.title))).toBe(true);
  });
});

describe("promptDrivenBreakdown", () => {
  it("creates one subtask per Amazon leadership principle", () => {
    const result = promptDrivenBreakdown(
      "帮我添加amazon 16 principles，每一个subtask是每个principle",
      "Behavior question",
    );
    expect(result).not.toBeNull();
    expect(result!.subtasks).toHaveLength(16);
    expect(result!.subtasks.map((s) => s.title)).toEqual([
      ...AMAZON_LEADERSHIP_PRINCIPLES,
    ]);
    expect(result!.subtasks.every((s) => !s.isEntryPoint)).toBe(true);
  });

  it("returns null for unrelated prompts", () => {
    expect(promptDrivenBreakdown("按周计划拆分", "整理衣柜")).toBeNull();
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
