import { describe, it, expect } from "vitest";
import { timeEntriesToCsv } from "./time-entries-csv";

describe("timeEntriesToCsv", () => {
  it("formats rows with header", () => {
    const csv = timeEntriesToCsv([
      {
        startedAt: "2026-06-17T10:00:00.000Z",
        durationMin: 45,
        source: "manual",
        taskTitle: "Deep work",
        pillarName: "工作",
        focusTrack: "进大厂",
        note: null,
      },
    ]);
    expect(csv.split("\n")[0]).toBe(
      "started_at,duration_min,source,task_title,pillar_name,focus_track,note",
    );
    expect(csv).toContain("Deep work");
    expect(csv).toContain(",45,");
  });
});
