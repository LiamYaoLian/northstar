import { describe, it } from "vitest";

/**
 * TDD contract generated from plan.md — Project feature.
 * Domain/service tests above are implemented; UI/API surface remains todo.
 */
describe("plan.md project TDD contract", () => {
  describe("API routes", () => {
    it.todo("GET /api/projects returns active projects for the current user");
    it.todo("POST /api/projects creates a Work-pillar project");
    it.todo("PATCH /api/projects/[id] archives and renames projects");
    it.todo("POST /api/tasks accepts projectId on create");
    it.todo("PATCH /api/tasks/[id] accepts projectId on update");
  });

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
