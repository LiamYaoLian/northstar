import { describe, it } from "vitest";

/**
 * TDD contract generated from plan.md — Project feature.
 * Domain/service tests above are implemented; UI/API surface remains todo.
 */
describe("plan.md project TDD contract", () => {
  // API routes covered by src/app/api/projects/*.test.ts and src/app/api/tasks/*.test.ts

  describe("Tasks page UI", () => {
    it.todo("shows ProjectFilter chips when Work category is selected");
    it.todo("clears project filter when leaving Work category");
    it.todo("uses mergeFilteredTaskReorder when project filter is active");
    it.todo("supports inline project creation in the task form");
  });

  describe("TaskCard UI", () => {
    it.todo("shows TaskProjectSelect only for Work pillar tasks");
    it.todo("renders pillar · focusTrack · project badge segments");
    it.todo("changeProject updates task via optimistic patch");
  });
});
