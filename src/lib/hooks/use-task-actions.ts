import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Messages } from "@/lib/i18n/types";
import type {
  BreakdownPreviewResult,
  ProposedSubtask,
} from "@/lib/tasks/subtask-diff";

type TaskActionErrors = Messages["errors"];

type UseTaskActionsOptions = {
  reload: () => Promise<void>;
  errors: TaskActionErrors;
  onError: (message: string) => void;
  applyOptimisticTaskPatch?: (
    id: string,
    patch: Record<string, unknown>,
  ) => () => void;
};

export function useTaskActions({
  reload,
  errors,
  onError,
  applyOptimisticTaskPatch,
}: UseTaskActionsOptions) {
  const [recalculating, setRecalculating] = useState(false);

  const patchTask = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      try {
        await apiFetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        await reload();
      } catch (err) {
        onError(err instanceof Error ? err.message : errors.updateTaskFailed);
      }
    },
    [reload, errors.updateTaskFailed, onError],
  );

  const changePillar = useCallback(
    (taskId: string, pillarId: string | null, focusTrack?: string | null) => {
      const body: Record<string, unknown> = { pillarId };
      if (focusTrack !== undefined) body.focusTrack = focusTrack;
      void patchTask(taskId, body);
    },
    [patchTask],
  );

  const recalculatePriority = useCallback(async () => {
    try {
      setRecalculating(true);
      await apiFetch("/api/tasks/recalculate-priorities", { method: "POST" });
      await reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : errors.recalculateFailed);
    } finally {
      setRecalculating(false);
    }
  }, [reload, errors.recalculateFailed, onError]);

  const breakdownTask = useCallback(
    async (taskId: string, userPrompt?: string): Promise<BreakdownPreviewResult | null> => {
      try {
        const result = await apiFetch<
          BreakdownPreviewResult | { preview: false }
        >(`/api/tasks/${taskId}/breakdown`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: userPrompt ?? "" }),
        });
        if (result.preview) {
          return result;
        }
        await reload();
        return null;
      } catch (err) {
        onError(err instanceof Error ? err.message : errors.breakdownFailed);
        throw err;
      }
    },
    [reload, errors.breakdownFailed, onError],
  );

  const applyBreakdown = useCallback(
    async (taskId: string, proposed: ProposedSubtask[]) => {
      try {
        await apiFetch(`/api/tasks/${taskId}/breakdown/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposed }),
        });
        await reload();
      } catch (err) {
        onError(err instanceof Error ? err.message : errors.breakdownFailed);
        throw err;
      }
    },
    [reload, errors.breakdownFailed, onError],
  );

  const patchSubtask = useCallback(
    async (subtaskId: string, body: { isDone?: boolean; title?: string }) => {
      try {
        await apiFetch(`/api/subtasks/${subtaskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        await reload();
      } catch (err) {
        onError(err instanceof Error ? err.message : errors.updateSubtaskFailed);
      }
    },
    [reload, errors.updateSubtaskFailed, onError],
  );

  const toggleSubtask = useCallback(
    (subtaskId: string, isDone: boolean) => {
      void patchSubtask(subtaskId, { isDone });
    },
    [patchSubtask],
  );

  const updateTaskTitle = useCallback(
    (taskId: string, title: string) => {
      void patchTask(taskId, { title });
    },
    [patchTask],
  );

  const updateEstimatedMin = useCallback(
    (id: string, minutes: number | null) => {
      const revert = applyOptimisticTaskPatch?.(id, { estimatedMin: minutes });
      void (async () => {
        try {
          await apiFetch(`/api/tasks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estimatedMin: minutes }),
          });
        } catch (err) {
          revert?.();
          onError(err instanceof Error ? err.message : errors.updateTaskFailed);
        }
      })();
    },
    [applyOptimisticTaskPatch, errors.updateTaskFailed, onError],
  );

  const updateSubtaskTitle = useCallback(
    (subtaskId: string, title: string) => {
      void patchSubtask(subtaskId, { title });
    },
    [patchSubtask],
  );

  const addSubtask = useCallback(
    async (taskId: string, title: string) => {
      try {
        await apiFetch(`/api/tasks/${taskId}/subtasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        await reload();
      } catch (err) {
        onError(err instanceof Error ? err.message : errors.addSubtaskFailed);
        throw err;
      }
    },
    [reload, errors.addSubtaskFailed, onError],
  );

  const deleteSubtask = useCallback(
    async (subtaskId: string) => {
      try {
        await apiFetch(`/api/subtasks/${subtaskId}`, { method: "DELETE" });
        await reload();
      } catch (err) {
        onError(err instanceof Error ? err.message : errors.deleteSubtaskFailed);
      }
    },
    [reload, errors.deleteSubtaskFailed, onError],
  );

  const reorderSubtasks = useCallback(
    async (taskId: string, orderedIds: string[]) => {
      try {
        await apiFetch(`/api/tasks/${taskId}/subtasks/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        });
        await reload();
      } catch (err) {
        onError(err instanceof Error ? err.message : errors.reorderSubtasksFailed);
        throw err;
      }
    },
    [reload, errors.reorderSubtasksFailed, onError],
  );

  const reorderTasks = useCallback(
    async (orderedIds: string[]) => {
      try {
        await apiFetch("/api/tasks/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        });
        await reload();
      } catch (err) {
        onError(err instanceof Error ? err.message : errors.reorderTasksFailed);
        throw err;
      }
    },
    [reload, errors.reorderTasksFailed, onError],
  );

  const logTime = useCallback(
    async (taskId: string, minutes: number) => {
      try {
        await apiFetch("/api/time-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, durationMin: minutes }),
        });
        await reload();
      } catch (err) {
        onError(err instanceof Error ? err.message : errors.logTimeFailed);
      }
    },
    [reload, errors.logTimeFailed, onError],
  );

  return {
    recalculating,
    patchTask,
    changePillar,
    recalculatePriority,
    breakdownTask,
    applyBreakdown,
    toggleSubtask,
    updateTaskTitle,
    updateEstimatedMin,
    updateSubtaskTitle,
    addSubtask,
    deleteSubtask,
    reorderSubtasks,
    reorderTasks,
    logTime,
  };
}
