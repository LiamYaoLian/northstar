import { useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type { UseTaskActionsOptions } from "./types";

export function useSubtaskActions({
  reload,
  errors,
  onError,
  applyOptimisticSubtaskPatch,
}: Pick<
  UseTaskActionsOptions,
  "reload" | "errors" | "onError" | "applyOptimisticSubtaskPatch"
>) {
  const patchSubtask = useCallback(
    async (
      subtaskId: string,
      body: { isDone?: boolean; title?: string; estimatedMin?: number | null },
    ) => {
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

  const updateSubtaskTitle = useCallback(
    (subtaskId: string, title: string) => {
      void patchSubtask(subtaskId, { title });
    },
    [patchSubtask],
  );

  const updateSubtaskEstimatedMin = useCallback(
    (subtaskId: string, minutes: number | null) => {
      const revert = applyOptimisticSubtaskPatch?.(subtaskId, {
        estimatedMin: minutes,
      });
      void (async () => {
        try {
          await apiFetch(`/api/subtasks/${subtaskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estimatedMin: minutes }),
          });
        } catch (err) {
          revert?.();
          onError(err instanceof Error ? err.message : errors.updateSubtaskFailed);
        }
      })();
    },
    [applyOptimisticSubtaskPatch, errors.updateSubtaskFailed, onError],
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

  return {
    toggleSubtask,
    updateSubtaskTitle,
    updateSubtaskEstimatedMin,
    addSubtask,
    deleteSubtask,
    reorderSubtasks,
  };
}
