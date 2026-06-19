import type { FocusTrack } from "@/lib/db/schema";
import { parseJson } from "@/lib/utils";

/** Priority: explicit input > classify > project default (Work pillar only). */
export function resolveCreateFocusTrack(input: {
  explicitFocusTrack: string | null | undefined;
  classifiedFocusTrack: string | null;
  projectFocusTrack: string | null;
  pillarId: string | null;
  workPillarId: string | undefined;
}): string | null {
  if (input.explicitFocusTrack !== undefined) {
    return input.explicitFocusTrack;
  }

  if (input.pillarId !== input.workPillarId) {
    return null;
  }

  if (input.classifiedFocusTrack) {
    return input.classifiedFocusTrack;
  }

  return input.projectFocusTrack;
}

export function parseWorkFocusTrackNames(
  focusTracksJson: string | null | undefined,
): string[] {
  const tracks = parseJson<FocusTrack[]>(focusTracksJson, []);
  return tracks.map((track) => track.name);
}

export function isValidWorkFocusTrack(
  focusTrack: string | null | undefined,
  focusTracksJson: string | null | undefined,
): boolean {
  if (!focusTrack) return true;
  return parseWorkFocusTrackNames(focusTracksJson).includes(focusTrack);
}

export function shouldClearProjectIdOnPillarChange(
  nextPillarId: string | null,
  workPillarId: string | undefined,
): boolean {
  if (!workPillarId) return true;
  return nextPillarId !== workPillarId;
}

export function taskPillarMatchesProject(
  taskPillarId: string | null,
  projectPillarId: string,
): boolean {
  return taskPillarId === projectPillarId;
}
