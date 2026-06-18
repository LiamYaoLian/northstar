import type { StrategicPillar } from "@/lib/db/schema";

export const WORK_PILLAR_NAME = "工作";

export function findWorkPillar(
  pillars: Pick<StrategicPillar, "id" | "name">[],
): StrategicPillar | undefined {
  return pillars.find((p) => p.name === WORK_PILLAR_NAME) as
    | StrategicPillar
    | undefined;
}

export function isWorkPillar(
  pillar: Pick<StrategicPillar, "id" | "name">,
  workPillar: Pick<StrategicPillar, "id"> | undefined,
): boolean {
  return Boolean(workPillar && pillar.id === workPillar.id);
}
