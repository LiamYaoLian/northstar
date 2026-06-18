import { describe, it, expect } from "vitest";
import {
  parseExplicitDuration,
  ruleBasedEstimateTime,
} from "./estimate-time";

describe("parseExplicitDuration", () => {
  it("parses minutes", () => {
    expect(parseExplicitDuration("晨跑 30min")).toBe(30);
    expect(parseExplicitDuration("standup 15 mins")).toBe(15);
  });

  it("parses hours", () => {
    expect(parseExplicitDuration("deep work 1.5h")).toBe(90);
    expect(parseExplicitDuration("写文档 2小时")).toBe(120);
  });

  it("returns null when no duration", () => {
    expect(parseExplicitDuration("准备投资人 deck")).toBeNull();
  });
});

describe("ruleBasedEstimateTime", () => {
  it("uses explicit duration from title", () => {
    expect(ruleBasedEstimateTime("晨跑 30min").estimatedMin).toBe(30);
  });

  it("uses breakdown template totals", () => {
    expect(ruleBasedEstimateTime("刷 LC 题").estimatedMin).toBe(47);
    expect(ruleBasedEstimateTime("准备投资人 deck").estimatedMin).toBe(112);
  });

  it("defaults for unknown tasks", () => {
    expect(ruleBasedEstimateTime("random todo").estimatedMin).toBe(77);
  });

  it("returns null for empty title", () => {
    expect(ruleBasedEstimateTime("  ").estimatedMin).toBeNull();
  });
});
