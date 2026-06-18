import { describe, it, expect } from "vitest";
import { findWorkPillar, isWorkPillar, WORK_PILLAR_NAME } from "./pillars";
import { testPillars } from "./test-fixtures";

describe("pillars", () => {
  it("finds work pillar by name", () => {
    const work = findWorkPillar(testPillars);
    expect(work?.id).toBe("p-work");
    expect(WORK_PILLAR_NAME).toBe("工作");
  });

  it("detects work pillar membership", () => {
    const work = findWorkPillar(testPillars)!;
    expect(isWorkPillar(testPillars[0], work)).toBe(true);
    expect(isWorkPillar(testPillars[1], work)).toBe(false);
  });
});
