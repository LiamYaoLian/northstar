import { useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { buildProjectOptimisticPatch } from "@/lib/tasks/project-optimistic";
import { buildPillarOptimisticPatch } from "./pillar-optimistic";
import type { OptimisticTaskPatcher, UseTaskActionsOptions } from "./types";

export function useOptimisticTaskPatcher({
  errors,
  onError,
  applyOptimisticTaskPatch,
}: Pick<
  UseTaskActionsOptions,
  "errors" | "onError" | "applyOptimisticTaskPatch"
>): OptimisticTaskPatcher {
  return useCallback(
    (id, body, optimisticPatch) => {
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
}

export function useTaskPatchActions({
  reload,
  errors,
  onError,
  pillars,
  projects,
  optimisticPatchTask,
}: Pick<
  UseTaskActionsOptions,
  "reload" | "errors" | "onError" | "pillars" | "projects"
> & { optimisticPatchTask: OptimisticTaskPatcher }) {
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

  const changeProject = useCallback(
    (taskId: string, projectId: string | null) => {
      const body = { projectId };
      const optimisticPatch =
        projects != null
          ? buildProjectOptimisticPatch(projects, projectId)
          : body;
      optimisticPatchTask(taskId, body, optimisticPatch);
    },
    [optimisticPatchTask, projects],
  );

  const updateEstimatedMin = useCallback(
    (id: string, minutes: number | null) => {
      optimisticPatchTask(id, { estimatedMin: minutes }, { estimatedMin: minutes });
    },
    [optimisticPatchTask],
  );

  const updateTaskDates = useCallback(
    (id: string, patch: { startAt?: string | null; dueAt?: string | null }) => {
      optimisticPatchTask(id, patch, patch);
    },
    [optimisticPatchTask],
  );

  const updateTaskTitle = useCallback(
    (taskId: string, title: string) => {
      void patchTask(taskId, { title });
    },
    [patchTask],
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
    patchTask,
    changePillar,
    changeProject,
    updateEstimatedMin,
    updateTaskDates,
    updateTaskTitle,
    deleteTask,
    logTime,
  };
}
