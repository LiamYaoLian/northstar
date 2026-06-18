import { describe, it, expect } from "vitest";
import { completionsToCsv } from "./completions-csv";
import type { TaskCompletionEvent } from "@/lib/tasks/completion-events";

describe("completionsToCsv", () => {
  it("escapes commas and quotes in titles", () => {
    const csv = completionsToCsv([
      {
        id: "1",
        taskId: "t1",
        completedAt: "2026-06-18T10:00:00.000Z",
        occurrenceDate: "2026-06-18",
        taskTitle: 'Say "hello", team',
        pillarId: "p1",
        pillarName: "工作",
        pillarColor: "#000",
        focusTrack: "进大厂",
        recurrenceType: "none",
        createdAt: "2026-06-18T10:00:00.000Z",
      },
    ]);
    expect(csv).toContain('"Say ""hello"", team"');
    expect(csv.split("\n")).toHaveLength(2);
  });
});
