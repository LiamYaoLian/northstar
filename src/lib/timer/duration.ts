export function computeDurationMin(elapsedMs: number): number {
  return Math.max(1, Math.round(elapsedMs / 60_000));
}
