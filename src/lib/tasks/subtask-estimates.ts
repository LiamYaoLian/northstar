export function sumSubtaskEstimatedMin(
  subtasks: { estimatedMin: number | null }[],
): number | null {
  const values = subtasks
    .map((subtask) => subtask.estimatedMin)
    .filter((value): value is number => value != null && value > 0);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

export function resolveTaskEstimatedMin(
  taskEstimatedMin: number | null,
  subtasks: { estimatedMin: number | null }[],
): number | null {
  if (subtasks.length === 0) return taskEstimatedMin;
  return sumSubtaskEstimatedMin(subtasks) ?? taskEstimatedMin;
}
