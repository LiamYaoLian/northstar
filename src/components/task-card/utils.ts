import { WORK_PILLAR_NAME } from "@/lib/pillars";
import type { Subtask } from "@/lib/db/schema";
import type { PillarOption, TaskWithMeta } from "./types";

export const CATEGORY_SELECT_CLASS =
  "rounded-full border bg-white px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-accent";

export function isTaskIntimidating(intimidationScore: number): boolean {
  return intimidationScore >= 4;
}

export function formatPriorityScore(priorityScore: number): string {
  return (priorityScore * 100).toFixed(0);
}

export function formatFactorPercent(value: number): string {
  return (value * 100).toFixed(0);
}

export function getDefaultLogMinutes(estimatedMin: number | null): number {
  return estimatedMin ?? 30;
}

export function getSubtaskProgress(subtasks: Subtask[]): {
  done: number;
  total: number;
} {
  const done = subtasks.filter((s) => s.isDone).length;
  return { done, total: subtasks.length };
}

export function resolveSelectedPillar(
  task: Pick<TaskWithMeta, "pillarId" | "pillarName" | "pillarColor">,
  pillars?: PillarOption[],
): PillarOption | undefined {
  const fromList = pillars?.find((p) => p.id === task.pillarId);
  if (fromList) return fromList;

  if (!task.pillarName) return undefined;

  return {
    id: task.pillarId ?? "",
    name: task.pillarName,
    color: task.pillarColor ?? "#6b7280",
    focusTracks: [],
  };
}

export function isWorkPillarOption(pillar: PillarOption | undefined): boolean {
  return pillar?.name === WORK_PILLAR_NAME;
}

export function pillarSelectStyle(pillar: PillarOption | undefined) {
  if (!pillar) return undefined;
  return { borderColor: pillar.color, color: pillar.color };
}

export function pillarBadgeStyle(color: string | undefined) {
  if (!color) return undefined;
  return { backgroundColor: `${color}22`, color };
}
