import type { StrategicPillar, Task, TimeEntry, FocusTrack } from "@/lib/db/schema";
import { parseJson } from "@/lib/utils";

export type PillarAlignment = {
  pillarId: string;
  name: string;
  color: string;
  targetPct: number;
  actualPct: number;
  drift: number;
  floorMinPerWeek?: number | null;
  capMaxPct?: number | null;
  isHardConstraint: boolean;
  alert?: "under_floor" | "over_cap" | "under_target" | "over_target";
};

export type FocusTrackAlignment = {
  name: string;
  targetShare: number;
  actualShare: number;
  drift: number;
};

export type AlignmentResult = {
  alignmentScore: number;
  totalLoggedMin: number;
  pillars: PillarAlignment[];
  unallocatedPct: number;
};

export type ProcrastinationSignal = {
  taskId: string;
  title: string;
  reason: string;
  daysSinceCreated: number;
  timeLoggedMin: number;
};

export function computePillarMinutes(
  pillars: StrategicPillar[],
  tasks: Task[],
  entries: TimeEntry[],
): Map<string, number> {
  const taskPillar = new Map(tasks.map((t) => [t.id, t.pillarId]));
  const minutes = new Map<string, number>();
  for (const pillar of pillars) {
    minutes.set(pillar.id, 0);
  }

  let unallocated = 0;
  for (const entry of entries) {
    const pillarId = taskPillar.get(entry.taskId);
    if (!pillarId) {
      unallocated += entry.durationMin;
      continue;
    }
    minutes.set(pillarId, (minutes.get(pillarId) ?? 0) + entry.durationMin);
  }

  minutes.set("__unallocated__", unallocated);
  return minutes;
}

export function computeAlignment(
  pillars: StrategicPillar[],
  tasks: Task[],
  entries: TimeEntry[],
): AlignmentResult {
  const pillarMinutes = computePillarMinutes(pillars, tasks, entries);
  const total = [...pillarMinutes.values()].reduce((a, b) => a + b, 0);

  const pillarAlignments: PillarAlignment[] = pillars.map((pillar) => {
    const actualMin = pillarMinutes.get(pillar.id) ?? 0;
    const actualPct = total > 0 ? (actualMin / total) * 100 : 0;
    const drift = actualPct - pillar.targetPct;

    let alert: PillarAlignment["alert"];
    if (pillar.capMaxPct && actualPct > pillar.capMaxPct) alert = "over_cap";
    else if (pillar.floorMinPerWeek && actualPct < pillar.targetPct * 0.5)
      alert = "under_floor";
    else if (drift < -5) alert = "under_target";
    else if (drift > 5) alert = "over_target";

    return {
      pillarId: pillar.id,
      name: pillar.name,
      color: pillar.color,
      targetPct: pillar.targetPct,
      actualPct: Math.round(actualPct * 10) / 10,
      drift: Math.round(drift * 10) / 10,
      floorMinPerWeek: pillar.floorMinPerWeek,
      capMaxPct: pillar.capMaxPct,
      isHardConstraint: pillar.isHardConstraint,
      alert,
    };
  });

  const unallocatedMin = pillarMinutes.get("__unallocated__") ?? 0;
  const unallocatedPct = total > 0 ? (unallocatedMin / total) * 100 : 0;
  const driftSum = pillarAlignments.reduce((sum, p) => sum + Math.abs(p.drift), 0);
  const alignmentScore = Math.max(0, Math.round((100 - driftSum / 2) * 10) / 10);

  return {
    alignmentScore,
    totalLoggedMin: total,
    pillars: pillarAlignments,
    unallocatedPct: Math.round(unallocatedPct * 10) / 10,
  };
}

export function computeWorkFocusTracks(
  workPillar: StrategicPillar,
  tasks: Task[],
  entries: TimeEntry[],
): FocusTrackAlignment[] {
  const tracks = parseJson<FocusTrack[]>(workPillar.focusTracks, []);
  if (tracks.length === 0) return [];

  const workTasks = new Set(
    tasks.filter((t) => t.pillarId === workPillar.id).map((t) => t.id),
  );
  const trackMinutes = new Map<string, number>();
  for (const track of tracks) trackMinutes.set(track.name, 0);

  let workTotal = 0;
  for (const entry of entries) {
    if (!workTasks.has(entry.taskId)) continue;
    workTotal += entry.durationMin;
    const task = tasks.find((t) => t.id === entry.taskId);
    const trackName = task?.focusTrack ?? tracks[0]?.name ?? "其他";
    trackMinutes.set(trackName, (trackMinutes.get(trackName) ?? 0) + entry.durationMin);
  }

  return tracks.map((track) => {
    const actualMin = trackMinutes.get(track.name) ?? 0;
    const actualShare = workTotal > 0 ? (actualMin / workTotal) * 100 : 0;
    return {
      name: track.name,
      targetShare: track.shareOfParent,
      actualShare: Math.round(actualShare * 10) / 10,
      drift: Math.round((actualShare - track.shareOfParent) * 10) / 10,
    };
  });
}

export function detectProcrastination(
  tasks: Task[],
  entries: TimeEntry[],
  now = new Date(),
): ProcrastinationSignal[] {
  const loggedByTask = new Map<string, number>();
  for (const e of entries) {
    loggedByTask.set(e.taskId, (loggedByTask.get(e.taskId) ?? 0) + e.durationMin);
  }

  return tasks
    .filter((t) => t.status !== "done")
    .map((task) => {
      const created = new Date(task.createdAt);
      const days = Math.floor((now.getTime() - created.getTime()) / 86400000);
      const logged = loggedByTask.get(task.id) ?? 0;

      let reason: string | null = null;
      if (days >= 7 && logged === 0) reason = `创建 ${days} 天，0 分钟记录`;
      else if (task.intimidationScore >= 4 && logged === 0)
        reason = `高恐吓任务，尚未开始`;
      else if (task.postponedCount >= 3) reason = `已推迟 ${task.postponedCount} 次`;

      if (!reason) return null;
      return {
        taskId: task.id,
        title: task.title,
        reason,
        daysSinceCreated: days,
        timeLoggedMin: logged,
      };
    })
    .filter((x): x is ProcrastinationSignal => x !== null)
    .slice(0, 5);
}
