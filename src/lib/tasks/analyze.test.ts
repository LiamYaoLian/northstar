import { describe, expect, it } from "vitest";
import { analyzeTaskTitle } from "@/lib/tasks/analyze";
import { testPillars } from "@/lib/test-fixtures";

describe("analyzeTaskTitle", () => {
  it("uses rule-based fallback when title is empty", async () => {
    const result = await analyzeTaskTitle("  ", testPillars);
    expect(result.classification.source).toBe("rules");
    expect(result.estimate.source).toBe("rules");
    expect(result.recurrence.source).toBe("rules");
  });

  it("uses rule-based fallback when pillars list is empty", async () => {
    const result = await analyzeTaskTitle("Morning run 30min", []);
    expect(result.classification.source).toBe("rules");
    expect(result.estimate.estimatedMin).toBeGreaterThan(0);
  });

  it("classifies work tasks with rule-based fallback (no API key)", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const result = await analyzeTaskTitle("刷 LeetCode 2h", testPillars);
    expect(result.classification.pillarName).toBe("工作");
    expect(result.classification.source).toBe("rules");
    expect(result.estimate.estimatedMin).toBe(120);

    if (prev) process.env.OPENAI_API_KEY = prev;
  });

  it("infers daily recurrence for habit titles via rule fallback", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await analyzeTaskTitle("每日晨跑", testPillars);
    expect(result.recurrence.recurrenceType).toBe("daily");
  });
});
