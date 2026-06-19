import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Messages } from "@/lib/i18n/types";
import { findWorkPillar, isWorkPillar } from "@/lib/pillars";
import type { PillarOption } from "@/lib/tasks/enrich-tasks";
import type {
  BreakdownPreviewResult,
  ProposedSubtask,
} from "@/lib/tasks/subtask-diff";

type TaskActionErrors = Messages["errors"];

type UseTaskActionsOptions = {
  reload: () => Promise<void>;
  errors: TaskActionErrors;
  onError: (message: string) => void;
  pillars?: PillarOption[];
  applyOptimisticTaskPatch?: (
    id: string,
    patch: Record<string, unknown>,
  ) => () => void;
  applyOptimisticSubtaskPatch?: (
    subtaskId: string,
    patch: Record<string, unknown>,
  ) => () => void;
};

function buildPillarOptimisticPatch(
  pillars: PillarOption[],
  pillarId: string | null,
  focusTrack: string | null | undefined,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { pillarId };
  if (focusTrack !== undefined) patch.focusTrack = focusTrack;

  const pillar = pillarId ? pillars.find((p) => p.id === pillarId) : null;
  patch.pillarName = pillar?.name;
  patch.pillarColor = pillar?.color;

  if (focusTrack === undefined) {
    const workPillar = findWorkPillar(pillars);
    if (pillarId === null || !pillar || !isWorkPillar(pillar, workPillar)) {
      patch.focusTrack = null;
    }
  }

  return patch;
}

export function useTaskActions({
  reload,
  errors,
  onError,
  pillars,
  applyOptimisticTaskPatch,
  applyOptimisticSubtaskPatch,
}: UseTaskActionsOptions) {
  const [recalculating, setRecalculating] = useState(false);

  const optimisticPatchTask = useCallback(
    (
      id: string,
      body: Record<string, unknown>,
      optimisticPatch: Record<string, unknown>,
    ) => {
      const revert = applyOptimisticTaskPatch?.(id, optimisticPatch);
      void (async () => {
        try {
          await apiFetch(`/api/tasks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } catch (err) {
          revert?.();
          onError(err instanceof Error ? err.message : errors.updateTaskFailed);
        }
      })();
    },
    [applyOptimisticTaskPatch, errors.updateTaskFailed, onError],
  );

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

      const optimisticPatch =
        pillars != null
          ? buildPillarOptimisticPatch(pillars, pillarId, focusTrack)
          : body;

      optimisticPatchTask(taskId, body, optimisticPatch);
    },
    [optimisticPatchTask, pillars],
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

  const updateTaskTitle = useCallback(
    (taskId: string, title: string) => {
      void patchTask(taskId, { title });
    },
    [patchTask],
  );

  const updateEstimatedMin = useCallback(
    (id: string, minutes: number | null) => {
      optimisticPatchTask(id, { estimatedMin: minutes }, { estimatedMin: minutes });
    },
    [optimisticPatchTask],
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

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
        await reload();
      } catch (err) {
        onError(err instanceof Error ? err.message : errors.deleteTaskFailed);
      }
    },
    [reload, errors.deleteTaskFailed, onError],
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
    updateSubtaskEstimatedMin,
    addSubtask,
    deleteSubtask,
    deleteTask,
    reorderSubtasks,
    reorderTasks,
    logTime,
  };
}
