import { WORK_TRACK_PRESETS } from "./templates";

export const WORK_TRACK_KEYS = ["big_tech", "explore", "invest", "balanced"] as const;
export type WorkTrackKey = (typeof WORK_TRACK_KEYS)[number];

export function primaryTrackFromWorkTrackKey(workTrack: string): string {
  if (workTrack === "big_tech") return "进大厂";
  if (workTrack === "explore") return "探索方向";
  if (workTrack === "invest") return "投资";
  const preset = WORK_TRACK_PRESETS[workTrack] ?? WORK_TRACK_PRESETS.balanced;
  return preset.focusTracks[0]?.name ?? "进大厂";
}

export function workTrackKeyFromPrimaryTrack(track: string | null): WorkTrackKey {
  if (track === "探索方向") return "explore";
  if (track === "投资") return "invest";
  if (track === "进大厂") return "big_tech";
  return "balanced";
}

export function focusTracksForWorkTrack(workTrack: string) {
  const preset = WORK_TRACK_PRESETS[workTrack] ?? WORK_TRACK_PRESETS.balanced;
  return preset.focusTracks;
}
