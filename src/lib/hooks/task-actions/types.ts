import type { Messages } from "@/lib/i18n/types";
import type { PillarOption, ProjectOption } from "@/lib/tasks/enrich-tasks";

export type TaskActionErrors = Messages["errors"];

export type UseTaskActionsOptions = {
  reload: () => Promise<void>;
  errors: TaskActionErrors;
  onError: (message: string) => void;
  pillars?: PillarOption[];
  projects?: ProjectOption[];
  applyOptimisticTaskPatch?: (
    id: string,
    patch: Record<string, unknown>,
  ) => () => void;
  applyOptimisticSubtaskPatch?: (
    subtaskId: string,
    patch: Record<string, unknown>,
  ) => () => void;
};

export type OptimisticTaskPatcher = (
  id: string,
  body: Record<string, unknown>,
  optimisticPatch: Record<string, unknown>,
) => void;
