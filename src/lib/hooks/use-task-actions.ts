import { useOptimisticTaskPatcher, useTaskPatchActions } from "./use-task-patch-actions";
import { useSubtaskActions } from "./use-subtask-actions";
import { useBreakdownActions } from "./use-breakdown-actions";
import type { UseTaskActionsOptions } from "./types";

export function useTaskActions(options: UseTaskActionsOptions) {
  const optimisticPatchTask = useOptimisticTaskPatcher(options);
  const taskPatchActions = useTaskPatchActions({
    ...options,
    optimisticPatchTask,
  });
  const subtaskActions = useSubtaskActions(options);
  const breakdownActions = useBreakdownActions(options);

  return {
    ...taskPatchActions,
    ...subtaskActions,
    ...breakdownActions,
  };
}

export type { UseTaskActionsOptions } from "./types";
