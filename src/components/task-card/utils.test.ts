import { describe, it, expect } from "vitest";
import {
  formatFactorPercent,
  formatPriorityScore,
  getDefaultLogMinutes,
  getSubtaskProgress,
  isTaskIntimidating,
  isWorkPillarOption,
  pillarBadgeStyle,
  pillarSelectStyle,
  resolveSelectedPillar,
} from "./utils";
import type { PillarOption } from "./types";

const pillars: PillarOption[] = [
  {
    id: "p-work",
    name: "工作",
    color: "#3b82f6",
    focusTracks: [{ name: "进大厂", shareOfParent: 100 }],
  },
  { id: "p-health", name: "健康", color: "#22c55e" },
];

describe("task-card utils", () => {
  it("detects intimidating tasks", () => {
    expect(isTaskIntimidating(4)).toBe(true);
    expect(isTaskIntimidating(3)).toBe(false);
  });

  it("formats priority and factor percentages", () => {
    expect(formatPriorityScore(0.756)).toBe("76");
    expect(formatFactorPercent(0.333)).toBe("33");
  });

  it("defaults log minutes to 30", () => {
    expect(getDefaultLogMinutes(null)).toBe(30);
    expect(getDefaultLogMinutes(45)).toBe(45);
  });

  it("counts subtask progress", () => {
    expect(
      getSubtaskProgress([
        { isDone: true } as never,
        { isDone: false } as never,
      ]),
    ).toEqual({ done: 1, total: 2 });
  });

  it("resolves pillar from list or task metadata", () => {
    expect(
      resolveSelectedPillar(
        { pillarId: "p-work", pillarName: "工作", pillarColor: "#3b82f6" },
        pillars,
      )?.id,
    ).toBe("p-work");

    expect(
      resolveSelectedPillar(
        { pillarId: null, pillarName: "健康", pillarColor: "#22c55e" },
        undefined,
      )?.name,
    ).toBe("健康");
  });

  it("identifies work pillar option", () => {
    expect(isWorkPillarOption(pillars[0])).toBe(true);
    expect(isWorkPillarOption(pillars[1])).toBe(false);
  });

  it("builds pillar select and badge styles", () => {
    expect(pillarSelectStyle(pillars[0])).toEqual({
      borderColor: "#3b82f6",
      color: "#3b82f6",
    });
    expect(pillarBadgeStyle("#22c55e")).toEqual({
      backgroundColor: "#22c55e22",
      color: "#22c55e",
    });
  });
});
