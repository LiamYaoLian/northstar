import type { ProjectOption } from "@/lib/tasks/enrich-tasks";
import type { TaskWithMeta } from "./types";
import { ProjectSelectWithCreate } from "@/components/project-select-with-create";

type TaskProjectSelectProps = {
  task: TaskWithMeta;
  projects: ProjectOption[];
  workPillarId: string;
  onChangeProject: (taskId: string, projectId: string | null) => void;
  onProjectCreated: (project: ProjectOption) => void;
  onError?: (message: string) => void;
};

export function TaskProjectSelect({
  task,
  projects,
  workPillarId,
  onChangeProject,
  onProjectCreated,
  onError,
}: TaskProjectSelectProps) {
  return (
    <ProjectSelectWithCreate
      inline
      value={task.projectId ?? ""}
      projects={projects}
      workPillarId={workPillarId}
      onChange={(projectId) => onChangeProject(task.id, projectId)}
      onProjectCreated={onProjectCreated}
      onError={onError}
    />
  );
}
