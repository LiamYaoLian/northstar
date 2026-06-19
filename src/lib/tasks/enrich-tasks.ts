import type { FocusTrack, Subtask, Task } from "@/lib/db/schema";
import { parseJson } from "@/lib/utils";

export type StrategyPillarDto = {
  id: string;
  name: string;
  color: string;
  focusTracks: string | null;
};

export type PillarOption = {
  id: string;
  name: string;
  color: string;
  focusTracks: FocusTrack[];
};

export type ProjectOption = {
  id: string;
  name: string;
  pillarId: string;
  focusTrack: string | null;
};

export type TaskRow = Task & {
  pillarName?: string;
  pillarColor?: string;
  projectName?: string;
  subtasks?: Subtask[];
};

export function parseStrategyPillars(
  pillars: StrategyPillarDto[],
): PillarOption[] {
  return pillars.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    focusTracks: parseJson<FocusTrack[]>(p.focusTracks, []),
  }));
}

export function enrichTasksWithPillars<T extends Task>(
  taskList: T[],
  pillars: PillarOption[],
): (T & { pillarName?: string; pillarColor?: string })[] {
  const pillarMap = new Map(pillars.map((p) => [p.id, p]));
  return taskList.map((t) => {
    const pillar = t.pillarId ? pillarMap.get(t.pillarId) : null;
    return {
      ...t,
      pillarName: pillar?.name,
      pillarColor: pillar?.color,
    };
  });
}

export function filterTasksByPillar<T extends Task>(
  taskList: T[],
  pillarId: string | null,
): T[] {
  if (!pillarId) return taskList;
  return taskList.filter((task) => task.pillarId === pillarId);
}

export function enrichTasksWithProjects<T extends Task>(
  taskList: T[],
  projectList: ProjectOption[],
): (T & { projectName?: string })[] {
  const projectMap = new Map(projectList.map((project) => [project.id, project]));
  return taskList.map((task) => {
    const project = task.projectId ? projectMap.get(task.projectId) : null;
    return {
      ...task,
      projectName: project?.name,
    };
  });
}

export function filterTasksByProject<T extends Task>(
  taskList: T[],
  projectId: string | null,
): T[] {
  if (!projectId) return taskList;
  return taskList.filter((task) => task.projectId === projectId);
}

/** Plan filter chain: pillar then project. */
export function filterTasksByPillarAndProject<T extends Task>(
  taskList: T[],
  pillarId: string | null,
  projectId: string | null,
): T[] {
  return filterTasksByProject(filterTasksByPillar(taskList, pillarId), projectId);
}

export function toProjectOptions(
  projects: Array<{
    id: string;
    name: string;
    pillarId: string;
    focusTrack: string | null;
  }>,
): ProjectOption[] {
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    pillarId: project.pillarId,
    focusTrack: project.focusTrack,
  }));
}

export function mergeFilteredTaskReorder(
  allIds: string[],
  filteredIds: string[],
  reorderedFilteredIds: string[],
): string[] {
  if (reorderedFilteredIds.length !== filteredIds.length) {
    return allIds;
  }

  const filteredSet = new Set(filteredIds);
  let filteredIndex = 0;

  return allIds.map((id) => {
    if (!filteredSet.has(id)) return id;
    return reorderedFilteredIds[filteredIndex++] ?? id;
  });
}
