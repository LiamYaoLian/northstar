import { useCallback, useState } from "react";
import type { BreakdownPreviewResult } from "@/lib/tasks/subtask-diff";

type UseTaskCardFormsOptions = {
  taskId: string;
  onBreakdown?: (id: string, userPrompt?: string) => Promise<BreakdownPreviewResult | null>;
  onApplyBreakdown?: (
    taskId: string,
    proposed: BreakdownPreviewResult["proposed"],
  ) => Promise<void>;
  onAddSubtask?: (
    taskId: string,
    title: string,
    isEntryPoint: boolean,
  ) => Promise<void>;
};

export function useTaskCardForms({
  taskId,
  onBreakdown,
  onApplyBreakdown,
  onAddSubtask,
}: UseTaskCardFormsOptions) {
  const [showManual, setShowManual] = useState(false);
  const [showAiBreakdown, setShowAiBreakdown] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [asEntryPoint, setAsEntryPoint] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pendingPreview, setPendingPreview] =
    useState<BreakdownPreviewResult | null>(null);

  const toggleManual = useCallback(() => setShowManual((v) => !v), []);
  const toggleAiBreakdown = useCallback(() => setShowAiBreakdown((v) => !v), []);

  const handleBreakdown = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onBreakdown) return;
      setBreaking(true);
      try {
        const preview = await onBreakdown(taskId, aiPrompt.trim() || undefined);
        setAiPrompt("");
        if (preview?.preview) {
          setPendingPreview(preview);
          return;
        }
        setShowAiBreakdown(false);
      } finally {
        setBreaking(false);
      }
    },
    [aiPrompt, onBreakdown, taskId],
  );

  const handleConfirmBreakdown = useCallback(async () => {
    if (!onApplyBreakdown || !pendingPreview) return;
    setApplying(true);
    try {
      await onApplyBreakdown(taskId, pendingPreview.proposed);
      setPendingPreview(null);
      setShowAiBreakdown(false);
    } finally {
      setApplying(false);
    }
  }, [onApplyBreakdown, pendingPreview, taskId]);

  const handleCancelBreakdown = useCallback(() => {
    setPendingPreview(null);
  }, []);

  const handleAddSubtask = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onAddSubtask || !subtaskTitle.trim()) return;
      setAdding(true);
      try {
        await onAddSubtask(taskId, subtaskTitle.trim(), asEntryPoint);
        setSubtaskTitle("");
        setAsEntryPoint(false);
      } finally {
        setAdding(false);
      }
    },
    [asEntryPoint, onAddSubtask, subtaskTitle, taskId],
  );

  return {
    showManual,
    showAiBreakdown,
    aiPrompt,
    setAiPrompt,
    subtaskTitle,
    setSubtaskTitle,
    asEntryPoint,
    setAsEntryPoint,
    breaking,
    applying,
    adding,
    pendingPreview,
    toggleManual,
    toggleAiBreakdown,
    handleBreakdown,
    handleConfirmBreakdown,
    handleCancelBreakdown,
    handleAddSubtask,
  };
}
