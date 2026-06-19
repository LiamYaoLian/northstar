import { useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type {
  BreakdownPreviewResult,
  ProposedSubtask,
} from "@/lib/tasks/subtask-diff";
import type { UseTaskActionsOptions } from "./types";

export function useBreakdownActions({
  reload,
  errors,
  onError,
}: Pick<UseTaskActionsOptions, "reload" | "errors" | "onError">) {
  const breakdownTask = useCallback(
    async (
      taskId: string,
      userPrompt?: string,
    ): Promise<BreakdownPreviewResult | null> => {
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

  return { breakdownTask, applyBreakdown };
}
