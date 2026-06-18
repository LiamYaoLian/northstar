import { describe, it, expect } from "vitest";
import {
  enrichTasksWithPillars,
  parseStrategyPillars,
} from "./enrich-tasks";
import { makeTask } from "@/lib/test-fixtures";

describe("parseStrategyPillars", () => {
  it("parses focus track JSON", () => {
    const pillars = parseStrategyPillars([
      {
        id: "p1",
        name: "工作",
        color: "#000",
        focusTracks: JSON.stringify([{ name: "进大厂", shareOfParent: 100 }]),
      },
    ]);
    expect(pillars[0].focusTracks[0].name).toBe("进大厂");
  });
});

describe("enrichTasksWithPillars", () => {
  it("attaches pillar name and color", () => {
    const pillars = parseStrategyPillars([
      {
        id: "p-work",
        name: "工作",
        color: "#3b82f6",
        focusTracks: null,
      },
    ]);
    const [task] = enrichTasksWithPillars(
      [makeTask({ pillarId: "p-work" })],
      pillars,
    );
    expect(task.pillarName).toBe("工作");
    expect(task.pillarColor).toBe("#3b82f6");
  });
});
