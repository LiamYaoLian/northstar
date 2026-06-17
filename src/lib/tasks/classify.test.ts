import { describe, it, expect } from "vitest";
import { ruleBasedClassify } from "./classify";
import type { PillarRef } from "./classify";

const pillars: PillarRef[] = [
  {
    id: "work",
    name: "工作",
    focusTracks: JSON.stringify([
      { name: "进大厂", shareOfParent: 50 },
      { name: "探索方向", shareOfParent: 30 },
      { name: "投资", shareOfParent: 20 },
    ]),
  },
  { id: "health", name: "健康", focusTracks: null },
  { id: "rel", name: "关系", focusTracks: null },
  { id: "fun", name: "娱乐", focusTracks: null },
  { id: "chore", name: "琐事", focusTracks: null },
];

describe("ruleBasedClassify", () => {
  it("classifies health tasks", () => {
    expect(ruleBasedClassify("晨跑 30min", pillars).pillarName).toBe("健康");
    expect(ruleBasedClassify("muscle building", pillars).pillarName).toBe("健康");
    expect(ruleBasedClassify("muscle buidling", pillars).pillarName).toBe("健康");
  });

  it("classifies chores", () => {
    expect(ruleBasedClassify("pay bills", pillars).pillarName).toBe("琐事");
  });

  it("defaults to work with big-tech focus track", () => {
    const result = ruleBasedClassify("Behavior question prep", pillars);
    expect(result.pillarName).toBe("工作");
    expect(result.focusTrack).toBe("进大厂");
    expect(result.source).toBe("rules");
  });

  it("classifies system design under work", () => {
    const result = ruleBasedClassify("System design payment", pillars);
    expect(result.pillarName).toBe("工作");
    expect(result.focusTrack).toBe("进大厂");
  });

  it("returns none for empty title", () => {
    expect(ruleBasedClassify("  ", pillars).match).toBe("none");
  });
});
