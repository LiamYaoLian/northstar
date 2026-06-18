import { describe, it, expect } from "vitest";
import {
  filterActiveTasks,
  sortTasks,
  takeTopTasks,
} from "./task-sorting";
import { makeTask } from "@/lib/test-fixtures";

describe("sortTasks", () => {
  const rows = [
    makeTask({ id: "a", priorityScore: 0.3, manualSortOrder: 2 }),
    makeTask({ id: "b", priorityScore: 0.9, manualSortOrder: 0 }),
    makeTask({ id: "c", priorityScore: 0.5, manualSortOrder: 1 }),
  ];

  it("sorts by priority score descending", () => {
    expect(sortTasks(rows, "priority").map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by manual order", () => {
    expect(sortTasks(rows, "manual").map((t) => t.id)).toEqual(["b", "c", "a"]);
  });
});

describe("filterActiveTasks", () => {
  it("excludes done tasks", () => {
    const rows = [
      makeTask({ id: "open", status: "todo" }),
      makeTask({ id: "closed", status: "done" }),
    ];
    expect(filterActiveTasks(rows).map((t) => t.id)).toEqual(["open"]);
  });
});

describe("takeTopTasks", () => {
  it("returns highest-priority active tasks up to limit", () => {
    const rows = [
      makeTask({ id: "low", priorityScore: 0.1, status: "todo" }),
      makeTask({ id: "high", priorityScore: 0.9, status: "todo" }),
      makeTask({ id: "done", priorityScore: 1, status: "done" }),
    ];
    expect(takeTopTasks(rows, 1).map((t) => t.id)).toEqual(["high"]);
  });
});
