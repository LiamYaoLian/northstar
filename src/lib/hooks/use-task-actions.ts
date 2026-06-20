import { useOptimisticTaskPatcher, useTaskPatchActions } from "./task-actions/use-task-patch-actions";
import { useSubtaskActions } from "./task-actions/use-subtask-actions";
import { useBreakdownActions } from "./task-actions/use-breakdown-actions";
import type { UseTaskActionsOptions } from "./task-actions/types";

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

export type { UseTaskActionsOptions } from "./task-actions/types";
