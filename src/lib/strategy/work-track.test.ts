import { describe, it, expect } from "vitest";
import {
  focusTracksForWorkTrack,
  primaryTrackFromWorkTrackKey,
  workTrackKeyFromPrimaryTrack,
} from "./work-track";

describe("work-track mapping", () => {
  it("maps preset keys to primary track labels", () => {
    expect(primaryTrackFromWorkTrackKey("big_tech")).toBe("进大厂");
    expect(primaryTrackFromWorkTrackKey("explore")).toBe("探索方向");
    expect(primaryTrackFromWorkTrackKey("invest")).toBe("投资");
  });

  it("round-trips primary track labels to preset keys", () => {
    expect(workTrackKeyFromPrimaryTrack("进大厂")).toBe("big_tech");
    expect(workTrackKeyFromPrimaryTrack("探索方向")).toBe("explore");
    expect(workTrackKeyFromPrimaryTrack("投资")).toBe("invest");
    expect(workTrackKeyFromPrimaryTrack(null)).toBe("balanced");
  });

  it("returns focus track weights for a preset", () => {
    const tracks = focusTracksForWorkTrack("invest");
    expect(tracks.find((t) => t.name === "投资")?.shareOfParent).toBe(70);
  });
});
