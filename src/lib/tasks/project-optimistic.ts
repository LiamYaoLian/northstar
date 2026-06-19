import type { ProjectOption } from "@/lib/tasks/enrich-tasks";

export function buildProjectOptimisticPatch(
  projects: ProjectOption[],
  projectId: string | null,
): Record<string, unknown> {
  const project = projectId
    ? projects.find((candidate) => candidate.id === projectId)
    : null;

  return {
    projectId,
    projectName: project?.name ?? null,
  };
}
