import { describe, it, expect } from "vitest";
import {
  enrichTasksWithPillars,
  filterTasksByPillar,
  mergeFilteredTaskReorder,
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

describe("filterTasksByPillar", () => {
  it("returns only tasks in the selected pillar", () => {
    const tasks = [
      makeTask({ id: "t1", pillarId: "p-work" }),
      makeTask({ id: "t2", pillarId: "p-health" }),
    ];
    expect(filterTasksByPillar(tasks, "p-work").map((task) => task.id)).toEqual([
      "t1",
    ]);
    expect(filterTasksByPillar(tasks, null)).toHaveLength(2);
  });
});

describe("mergeFilteredTaskReorder", () => {
  it("reorders only filtered ids within the full task order", () => {
    const merged = mergeFilteredTaskReorder(
      ["a", "b", "c", "d"],
      ["b", "d"],
      ["d", "b"],
    );
    expect(merged).toEqual(["a", "d", "c", "b"]);
  });
});
