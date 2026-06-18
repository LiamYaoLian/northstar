import { useCallback, useState } from "react";

type UseTaskCardFormsOptions = {
  taskId: string;
  onBreakdown?: (id: string, userPrompt?: string) => Promise<void>;
  onAddSubtask?: (
    taskId: string,
    title: string,
    isEntryPoint: boolean,
  ) => Promise<void>;
};

export function useTaskCardForms({
  taskId,
  onBreakdown,
  onAddSubtask,
}: UseTaskCardFormsOptions) {
  const [showManual, setShowManual] = useState(false);
  const [showAiBreakdown, setShowAiBreakdown] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [asEntryPoint, setAsEntryPoint] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const [adding, setAdding] = useState(false);

  const toggleManual = useCallback(() => setShowManual((v) => !v), []);
  const toggleAiBreakdown = useCallback(() => setShowAiBreakdown((v) => !v), []);

  const handleBreakdown = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onBreakdown) return;
      setBreaking(true);
      try {
        await onBreakdown(taskId, aiPrompt.trim() || undefined);
        setAiPrompt("");
        setShowAiBreakdown(false);
      } finally {
        setBreaking(false);
      }
    },
    [aiPrompt, onBreakdown, taskId],
  );

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
    adding,
    toggleManual,
    toggleAiBreakdown,
    handleBreakdown,
    handleAddSubtask,
  };
}
