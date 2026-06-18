import { describe, it, expect } from "vitest";
import { analyzeBrainDump } from "./critique";

describe("analyzeBrainDump", () => {
  it("flags multiple career tracks", () => {
    const result = analyzeBrainDump(
      "我想 leetcode 刷题进大厂，同时探索 web3 创业方向，还要研究投资仓位",
    );
    expect(result.findings.some((f) => f.code === "WORK_MULTI_TRACK")).toBe(true);
    expect(result.requiresWorkTrackChoice).toBe(true);
  });

  it("flags dual big-tech and staff paths", () => {
    const result = analyzeBrainDump("准备 leetcode 面试，同时争取 staff 晋升");
    expect(result.findings.some((f) => f.code === "DUAL_CAREER_PATH")).toBe(true);
  });

  it("suggests measurable north star", () => {
    const result = analyzeBrainDump("今年尽量努力，可能有一些进展");
    expect(result.requiresMeasurableNorthStar).toBe(true);
    expect(result.findings.some((f) => f.code === "NORTH_STAR_UNMEASURABLE")).toBe(
      true,
    );
  });

  it("notes health when mentioned", () => {
    const result = analyzeBrainDump("每周跑步三次，保持睡眠");
    expect(result.findings.some((f) => f.code === "HEALTH_NAMED")).toBe(true);
  });
});
