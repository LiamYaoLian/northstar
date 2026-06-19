import { describe, it, expect } from "vitest";
import {
  computeSubtaskDiff,
  hasSubtaskDiffChanges,
  resolveProposedSubtasks,
} from "./subtask-diff";

const existing = [
  {
    id: "s1",
    title: "Draft outline",
    isDone: true,
    sortOrder: 0,
    estimatedMin: 10,
  },
  {
    id: "s2",
    title: "Write slides",
    isDone: false,
    sortOrder: 1,
    estimatedMin: 20,
  },
];

describe("resolveProposedSubtasks", () => {
  it("reuses existing ids for unchanged titles", () => {
    const proposed = resolveProposedSubtasks(existing, [
      { title: "Draft outline", estimatedMin: 10 },
      { title: "Write slides", estimatedMin: 20 },
      { title: "Practice pitch", estimatedMin: 15 },
    ]);

    expect(proposed).toEqual([
      { title: "Draft outline", existingId: "s1", estimatedMin: 10 },
      { title: "Write slides", existingId: "s2", estimatedMin: 20 },
      { title: "Practice pitch", estimatedMin: 15 },
    ]);
  });
});

describe("computeSubtaskDiff", () => {
  it("shows git-style added and removed lines", () => {
    const proposed = resolveProposedSubtasks(existing, [
      { title: "Draft outline" },
      { title: "Run mock interview" },
    ]);
    const diff = computeSubtaskDiff(existing, proposed);

    expect(hasSubtaskDiffChanges(diff)).toBe(true);
    expect(diff.some((line) => line.type === "unchanged" && line.title === "Draft outline")).toBe(true);
    expect(diff.some((line) => line.type === "removed" && line.title === "Write slides")).toBe(true);
    expect(diff.some((line) => line.type === "added" && line.title === "Run mock interview")).toBe(true);
  });
});
