import { findWorkPillar, isWorkPillar } from "@/lib/pillars";
import type { PillarOption } from "@/lib/tasks/enrich-tasks";

export function buildPillarOptimisticPatch(
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
      patch.projectId = null;
      patch.projectName = null;
    }
  }

  return patch;
}
