import { describe, expect, it } from "vitest";
import {
  isValidWorkFocusTrack,
  parseWorkFocusTrackNames,
  resolveCreateFocusTrack,
  shouldClearProjectIdOnPillarChange,
  taskPillarMatchesProject,
} from "./project-domain";

describe("resolveCreateFocusTrack", () => {
  const workPillarId = "p-work";

  it("prefers explicit focusTrack over classify and project default", () => {
    expect(
      resolveCreateFocusTrack({
        explicitFocusTrack: "投资",
        classifiedFocusTrack: "进大厂",
        projectFocusTrack: "探索方向",
        pillarId: workPillarId,
        workPillarId,
      }),
    ).toBe("投资");
  });

  it("uses classify before project default on Work pillar", () => {
    expect(
      resolveCreateFocusTrack({
        explicitFocusTrack: undefined,
        classifiedFocusTrack: "进大厂",
        projectFocusTrack: "探索方向",
        pillarId: workPillarId,
        workPillarId,
      }),
    ).toBe("进大厂");
  });

  it("falls back to project default when classify has no track", () => {
    expect(
      resolveCreateFocusTrack({
        explicitFocusTrack: undefined,
        classifiedFocusTrack: null,
        projectFocusTrack: "探索方向",
        pillarId: workPillarId,
        workPillarId,
      }),
    ).toBe("探索方向");
  });

  it("returns null for non-Work pillar without explicit track", () => {
    expect(
      resolveCreateFocusTrack({
        explicitFocusTrack: undefined,
        classifiedFocusTrack: "进大厂",
        projectFocusTrack: "探索方向",
        pillarId: "p-health",
        workPillarId,
      }),
    ).toBeNull();
  });

  it("honors explicit null to clear focusTrack", () => {
    expect(
      resolveCreateFocusTrack({
        explicitFocusTrack: null,
        classifiedFocusTrack: "进大厂",
        projectFocusTrack: "探索方向",
        pillarId: workPillarId,
        workPillarId,
      }),
    ).toBeNull();
  });
});

describe("parseWorkFocusTrackNames", () => {
  it("parses focus track JSON", () => {
    expect(
      parseWorkFocusTrackNames(
        JSON.stringify([{ name: "进大厂", shareOfParent: 100 }]),
      ),
    ).toEqual(["进大厂"]);
  });
});

describe("isValidWorkFocusTrack", () => {
  const tracks = JSON.stringify([
    { name: "进大厂", shareOfParent: 50 },
    { name: "投资", shareOfParent: 50 },
  ]);

  it("accepts null or empty", () => {
    expect(isValidWorkFocusTrack(null, tracks)).toBe(true);
    expect(isValidWorkFocusTrack(undefined, tracks)).toBe(true);
  });

  it("accepts known track names", () => {
    expect(isValidWorkFocusTrack("进大厂", tracks)).toBe(true);
  });

  it("rejects unknown track names", () => {
    expect(isValidWorkFocusTrack("副业", tracks)).toBe(false);
  });
});

describe("shouldClearProjectIdOnPillarChange", () => {
  it("clears when moving off Work pillar", () => {
    expect(shouldClearProjectIdOnPillarChange("p-health", "p-work")).toBe(true);
  });

  it("keeps project when staying on Work pillar", () => {
    expect(shouldClearProjectIdOnPillarChange("p-work", "p-work")).toBe(false);
  });

  it("clears when pillar becomes null", () => {
    expect(shouldClearProjectIdOnPillarChange(null, "p-work")).toBe(true);
  });
});

describe("taskPillarMatchesProject", () => {
  it("matches when pillar ids align", () => {
    expect(taskPillarMatchesProject("p-work", "p-work")).toBe(true);
  });

  it("fails when task pillar differs from project pillar", () => {
    expect(taskPillarMatchesProject("p-health", "p-work")).toBe(false);
  });
});
