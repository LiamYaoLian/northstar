import { describe, expect, it } from "vitest";
import { buildProjectOptimisticPatch } from "./project-optimistic";

describe("buildProjectOptimisticPatch", () => {
  const projects = [
    { id: "proj-1", name: "找工作", pillarId: "p-work", focusTrack: "进大厂" },
    { id: "proj-2", name: "Northstar MVP", pillarId: "p-work", focusTrack: null },
  ];

  it("sets projectId and projectName when project exists", () => {
    expect(buildProjectOptimisticPatch(projects, "proj-1")).toEqual({
      projectId: "proj-1",
      projectName: "找工作",
    });
  });

  it("clears projectName when projectId is null", () => {
    expect(buildProjectOptimisticPatch(projects, null)).toEqual({
      projectId: null,
      projectName: null,
    });
  });

  it("keeps projectId but null name when project list is stale", () => {
    expect(buildProjectOptimisticPatch(projects, "missing")).toEqual({
      projectId: "missing",
      projectName: null,
    });
  });
});
