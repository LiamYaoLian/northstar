import type {
  StrategicPillar,
  Task,
  TimeEntry,
  Subtask,
  PriorityFactors,
  FocusTrack,
} from "@/lib/db/schema";
import { computeAlignment, computeWorkFocusTracks } from "@/lib/alignment";
import { parseJson } from "@/lib/utils";

const WEIGHTS = {
  strategicUrgency: 0.3,
  deadlinePressure: 0.25,
  intimidationEscalation: 0.15,
  dependencyBlocker: 0.1,
  staleness: 0.1,
  recentlyDonePenalty: 0.1,
};

export type PriorityResult = {
  taskId: string;
  priorityScore: number;
  factors: PriorityFactors;
  reason: string;
  rank: number;
};

function strategicUrgency(
  task: Task,
  pillarDrift: Map<string, number>,
  workPillar: StrategicPillar | undefined,
  workPrimaryTrack: string | null | undefined,
  tracks: FocusTrackAlignment[],
): number {
  if (!task.pillarId) return 0.3;
  const drift = pillarDrift.get(task.pillarId) ?? 0;
  let score = drift < 0 ? Math.min(1, Math.abs(drift) / 20) : 0.1;

  if (workPillar && task.pillarId === workPillar.id && task.focusTrack && workPrimaryTrack) {
    const track = tracks.find((t) => t.name === task.focusTrack);
    if (track && track.drift < 0 && task.focusTrack === workPrimaryTrack) {
      score = Math.min(1, score + Math.abs(track.drift) / 30);
    }
  }
  return score;
}

type FocusTrackAlignment = {
  name: string;
  drift: number;
};

function deadlinePressure(dueAt: string | null, now = new Date()): number {
  if (!dueAt) return 0.1;
  const due = new Date(dueAt);
  const days = (due.getTime() - now.getTime()) / 86400000;
  if (days < 0) return 1;
  return Math.min(1, 1 / Math.max(1, days));
}

function intimidationEscalation(
  task: Task,
  loggedMin: number,
): number {
  if (task.intimidationScore >= 4 && loggedMin === 0) return 0.8;
  if (task.intimidationScore >= 3 && loggedMin === 0) return 0.4;
  return 0;
}

function staleness(task: Task, now = new Date()): number {
  const days = (now.getTime() - new Date(task.createdAt).getTime()) / 86400000;
  return Math.min(0.5, days / 30);
}

function buildReason(factors: PriorityFactors, task: Task, pillarName?: string): string {
  const parts: string[] = [];
  if (factors.strategicUrgency > 0.4 && pillarName)
    parts.push(`${pillarName} 战略欠账`);
  if (factors.deadlinePressure > 0.5) parts.push("临近截止");
  if (factors.intimidationEscalation > 0.5) parts.push("高恐吓未启动");
  if (factors.staleness > 0.3) parts.push("积压较久");
  if (parts.length === 0) return "综合优先级";
  return parts.join(" · ");
}

export function computeTaskPriority(
  task: Task,
  pillars: StrategicPillar[],
  pillarDrift: Map<string, number>,
  loggedMin: number,
  workPrimaryTrack: string | null | undefined,
  workTrackAlignments: FocusTrackAlignment[],
  now = new Date(),
): { score: number; factors: PriorityFactors; reason: string } {
  if (task.isPinned) {
    return {
      score: 1,
      factors: {
        strategicUrgency: 0,
        deadlinePressure: 0,
        intimidationEscalation: 0,
        dependencyBlocker: 0,
        staleness: 0,
        recentlyDonePenalty: 0,
      },
      reason: "已置顶",
    };
  }

  const workPillar = pillars.find((p) => p.name === "工作");
  const factors: PriorityFactors = {
    strategicUrgency: strategicUrgency(
      task,
      pillarDrift,
      workPillar,
      workPrimaryTrack,
      workTrackAlignments,
    ),
    deadlinePressure: deadlinePressure(task.dueAt, now),
    intimidationEscalation: intimidationEscalation(task, loggedMin),
    dependencyBlocker: 0,
    staleness: staleness(task, now),
    recentlyDonePenalty: 0,
  };

  const score =
    WEIGHTS.strategicUrgency * factors.strategicUrgency +
    WEIGHTS.deadlinePressure * factors.deadlinePressure +
    WEIGHTS.intimidationEscalation * factors.intimidationEscalation +
    WEIGHTS.dependencyBlocker * factors.dependencyBlocker +
    WEIGHTS.staleness * factors.staleness -
    WEIGHTS.recentlyDonePenalty * factors.recentlyDonePenalty;

  const pillar = pillars.find((p) => p.id === task.pillarId);
  return {
    score: Math.round(score * 1000) / 1000,
    factors,
    reason: buildReason(factors, task, pillar?.name),
  };
}

function subtaskProgressBoost(task: Task, subtaskList: Subtask[]): number {
  if (subtaskList.length === 0) return 0;
  const entry = subtaskList.find((s) => s.isEntryPoint);
  if (entry && !entry.isDone) return 0.15;
  const doneRatio = subtaskList.filter((s) => s.isDone).length / subtaskList.length;
  if (doneRatio > 0 && doneRatio < 1) return 0.1;
  return 0;
}

export function rerankAll(
  taskList: Task[],
  pillars: StrategicPillar[],
  entries: TimeEntry[],
  workPrimaryTrack?: string | null,
  allSubtasks: Subtask[] = [],
  now = new Date(),
): PriorityResult[] {
  const alignment = computeAlignment(pillars, taskList, entries);
  const pillarDrift = new Map(
    alignment.pillars.map((p) => [p.pillarId, p.drift]),
  );

  const workPillar = pillars.find((p) => p.name === "工作");
  const workTracks = workPillar
    ? computeWorkFocusTracks(workPillar, taskList, entries)
    : [];

  const loggedByTask = new Map<string, number>();
  for (const e of entries) {
    loggedByTask.set(e.taskId, (loggedByTask.get(e.taskId) ?? 0) + e.durationMin);
  }

  const active = taskList.filter((t) => t.status !== "done");

  const subtasksByTask = new Map<string, Subtask[]>();
  for (const s of allSubtasks) {
    const list = subtasksByTask.get(s.parentTaskId) ?? [];
    list.push(s);
    subtasksByTask.set(s.parentTaskId, list);
  }

  const results = active.map((task) => {
    const { score, factors, reason } = computeTaskPriority(
      task,
      pillars,
      pillarDrift,
      loggedByTask.get(task.id) ?? 0,
      workPrimaryTrack,
      workTracks,
      now,
    );
    const boost = subtaskProgressBoost(task, subtasksByTask.get(task.id) ?? []);
    return {
      taskId: task.id,
      priorityScore: Math.min(1, score + boost),
      factors,
      reason: boost > 0 && reason !== "已置顶" ? `${reason} · 入口步骤待完成` : reason,
      rank: 0,
    };
  });

  results.sort((a, b) => b.priorityScore - a.priorityScore);
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  return results;
}

export function suggestFocusTrack(
  title: string,
  workPillar: StrategicPillar | undefined,
): string | null {
  if (!workPillar) return null;
  const tracks = parseJson<FocusTrack[]>(workPillar.focusTracks, []);
  const t = title.toLowerCase();
  if (/leetcode|lc|面试|mock|投递|内推|system design|sd/.test(t)) return "进大厂";
  if (/调研|探索|请教|创业|方向|1:1/.test(t)) return "探索方向";
  if (/投资|理财|研报|仓位|复盘/.test(t)) return "投资";
  return tracks[0]?.name ?? null;
}
