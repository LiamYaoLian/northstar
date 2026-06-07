import "server-only";

import { getDb } from "@/lib/db";
import { tasks, timeEntries, subtasks, strategicPillars, northStars } from "@/lib/db/schema";
import {
  generateBreakdown,
  shouldAutoBreakdown,
} from "@/lib/ai/breakdown";
import { rerankAll, suggestFocusTrack } from "@/lib/priority";
import { id, nowIso } from "@/lib/utils";
import { eq } from "drizzle-orm";
import type { Subtask } from "@/lib/db/schema";

function persistPriorities() {
  const db = getDb();
  const allTasks = db.select().from(tasks).all();
  const pillars = db.select().from(strategicPillars).all();
  const entries = db.select().from(timeEntries).all();
  const star = db.select().from(northStars).all()[0];
  const allSubtasks = db.select().from(subtasks).all();
  const results = rerankAll(
    allTasks,
    pillars,
    entries,
    star?.workPrimaryTrack,
    allSubtasks,
  );
  const ts = nowIso();

  for (const r of results) {
    db.update(tasks)
      .set({
        priorityScore: r.priorityScore,
        priorityFactors: JSON.stringify(r.factors),
        priorityComputedAt: ts,
        updatedAt: ts,
      })
      .where(eq(tasks.id, r.taskId))
      .run();
  }
}

export type TaskSortMode = "priority" | "manual";

export function listTasks(status?: string, sort: TaskSortMode = "priority") {
  const db = getDb();
  const all = db.select().from(tasks).all();
  const filtered = status ? all.filter((t) => t.status === status) : all;
  if (sort === "manual") {
    return filtered.sort((a, b) => {
      if (a.manualSortOrder !== b.manualSortOrder) {
        return a.manualSortOrder - b.manualSortOrder;
      }
      return b.priorityScore - a.priorityScore;
    });
  }
  return filtered.sort((a, b) => b.priorityScore - a.priorityScore);
}

export function listTasksWithSubtasks(
  status?: string,
  sort: TaskSortMode = "priority",
) {
  const db = getDb();
  const taskList = listTasks(status, sort);
  const allSubtasks = db.select().from(subtasks).all();
  const byParent = new Map<string, Subtask[]>();
  for (const s of allSubtasks) {
    const list = byParent.get(s.parentTaskId) ?? [];
    list.push(s);
    byParent.set(s.parentTaskId, list);
  }
  return taskList.map((t) => ({
    ...t,
    subtasks: (byParent.get(t.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export function getTodayTasks(limit = 5) {
  return listTasks()
    .filter((t) => t.status !== "done")
    .slice(0, limit);
}

export async function createTask(input: {
  title: string;
  description?: string;
  pillarId?: string;
  focusTrack?: string;
  estimatedMin?: number;
  dueAt?: string;
  intimidationScore?: number;
  autoBreakdown?: boolean;
}) {
  const db = getDb();
  const ts = nowIso();
  const pillars = db.select().from(strategicPillars).all();
  const workPillar = pillars.find((p) => p.name === "工作");

  let pillarId = input.pillarId;
  let focusTrack = input.focusTrack;

  if (!pillarId) {
    const title = input.title.toLowerCase();
    if (/跑步|锻炼|健身|睡眠|冥想/.test(title)) {
      pillarId = pillars.find((p) => p.name === "健康")?.id;
    } else if (/陪伴|家庭|晚餐|约会|朋友/.test(title)) {
      pillarId = pillars.find((p) => p.name === "关系")?.id;
    } else if (/游戏|追剧|电影/.test(title)) {
      pillarId = pillars.find((p) => p.name === "娱乐")?.id;
    } else if (/家务|账单|快递|预约/.test(title)) {
      pillarId = pillars.find((p) => p.name === "琐事")?.id;
    } else {
      pillarId = workPillar?.id;
      focusTrack = suggestFocusTrack(input.title, workPillar) ?? undefined;
    }
  }

  const taskId = id();
  const maxOrder = db
    .select()
    .from(tasks)
    .all()
    .reduce((max, t) => Math.max(max, t.manualSortOrder ?? 0), 0);

  db.insert(tasks)
    .values({
      id: taskId,
      title: input.title,
      description: input.description ?? null,
      pillarId: pillarId ?? null,
      focusTrack: focusTrack ?? null,
      status: "todo",
      intimidationScore: input.intimidationScore ?? 2,
      priorityScore: 0,
      estimatedMin: input.estimatedMin ?? null,
      dueAt: input.dueAt ?? null,
      isPinned: false,
      manualSortOrder: maxOrder + 1,
      postponedCount: 0,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  if (
    input.autoBreakdown !== false &&
    shouldAutoBreakdown(input.title, input.intimidationScore)
  ) {
    await breakdownTask(taskId);
  } else {
    persistPriorities();
  }

  return db.select().from(tasks).where(eq(tasks.id, taskId)).all()[0];
}

export async function breakdownTask(taskId: string) {
  const db = getDb();
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).all()[0];
  if (!task) return null;

  const star = db.select().from(northStars).all()[0];
  const pillar = task.pillarId
    ? db
        .select()
        .from(strategicPillars)
        .where(eq(strategicPillars.id, task.pillarId))
        .all()[0]
    : null;

  const result = await generateBreakdown(task.title, task.description, {
    northStar: star?.statement,
    pillar: pillar?.name,
  });

  db.delete(subtasks).where(eq(subtasks.parentTaskId, taskId)).run();

  const ts = nowIso();
  result.subtasks.forEach((item, i) => {
    db.insert(subtasks)
      .values({
        id: id(),
        parentTaskId: taskId,
        title: item.title,
        sortOrder: i,
        isEntryPoint: item.isEntryPoint ?? i === 0,
        isDone: false,
        createdAt: ts,
      })
      .run();
  });

  db.update(tasks)
    .set({
      intimidationScore: result.intimidationScore ?? task.intimidationScore,
      estimatedMin: task.estimatedMin ?? result.estimatedMinTotal ?? null,
      updatedAt: ts,
    })
    .where(eq(tasks.id, taskId))
    .run();

  persistPriorities();

  return {
    task: db.select().from(tasks).where(eq(tasks.id, taskId)).all()[0],
    subtasks: listSubtasks(taskId),
    breakdown: result,
  };
}

export function toggleSubtask(subtaskId: string, isDone: boolean) {
  const db = getDb();
  db.update(subtasks)
    .set({ isDone })
    .where(eq(subtasks.id, subtaskId))
    .run();

  const sub = db.select().from(subtasks).where(eq(subtasks.id, subtaskId)).all()[0];
  if (!sub) return null;

  const siblings = listSubtasks(sub.parentTaskId);
  if (siblings.length > 0 && siblings.every((s) => s.isDone)) {
    updateTask(sub.parentTaskId, { status: "done" });
  }

  return db.select().from(subtasks).where(eq(subtasks.id, subtaskId)).all()[0];
}

export function updateTask(
  taskId: string,
  patch: Partial<{
    title: string;
    status: string;
    isPinned: boolean;
    pillarId: string | null;
    focusTrack: string | null;
    postponedCount: number;
    intimidationScore: number;
  }>,
) {
  const db = getDb();
  const ts = nowIso();
  const existing = db.select().from(tasks).where(eq(tasks.id, taskId)).all()[0];
  if (!existing) return null;

  const { intimidationScore, ...rest } = patch;
  const safePatch = {
    ...rest,
    ...(intimidationScore != null
      ? { intimidationScore: Math.min(5, Math.max(1, intimidationScore)) }
      : {}),
  };

  db.update(tasks)
    .set({
      ...safePatch,
      completedAt: patch.status === "done" ? ts : existing.completedAt,
      updatedAt: ts,
    })
    .where(eq(tasks.id, taskId))
    .run();

  persistPriorities();
  return db.select().from(tasks).where(eq(tasks.id, taskId)).all()[0];
}

export function addTimeEntry(input: {
  taskId: string;
  durationMin: number;
  source?: string;
  note?: string;
  startedAt?: string;
}) {
  const db = getDb();
  const ts = nowIso();
  db.insert(timeEntries)
    .values({
      id: id(),
      taskId: input.taskId,
      startedAt: input.startedAt ?? ts,
      durationMin: input.durationMin,
      source: input.source ?? "manual",
      note: input.note ?? null,
      createdAt: ts,
    })
    .run();

  persistPriorities();
  return db.select().from(timeEntries).all().slice(-1)[0];
}

export function listTimeEntries() {
  return getDb().select().from(timeEntries).all();
}

export function listSubtasks(taskId: string) {
  return getDb()
    .select()
    .from(subtasks)
    .where(eq(subtasks.parentTaskId, taskId))
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function createSubtask(
  taskId: string,
  input: { title: string; isEntryPoint?: boolean },
) {
  const db = getDb();
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).all()[0];
  if (!task) return null;

  const existing = listSubtasks(taskId);
  const ts = nowIso();
  const subtaskId = id();

  db.insert(subtasks)
    .values({
      id: subtaskId,
      parentTaskId: taskId,
      title: input.title.trim(),
      sortOrder: existing.length,
      isEntryPoint: input.isEntryPoint ?? existing.length === 0,
      isDone: false,
      createdAt: ts,
    })
    .run();

  db.update(tasks).set({ updatedAt: ts }).where(eq(tasks.id, taskId)).run();

  return db.select().from(subtasks).where(eq(subtasks.id, subtaskId)).all()[0];
}

export function deleteSubtask(subtaskId: string) {
  const db = getDb();
  const sub = db.select().from(subtasks).where(eq(subtasks.id, subtaskId)).all()[0];
  if (!sub) return false;

  db.delete(subtasks).where(eq(subtasks.id, subtaskId)).run();

  const remaining = listSubtasks(sub.parentTaskId);
  remaining.forEach((s, i) => {
    db.update(subtasks)
      .set({ sortOrder: i })
      .where(eq(subtasks.id, s.id))
      .run();
  });

  return true;
}

export function reorderTasks(orderedIds: string[]) {
  const db = getDb();
  const ts = nowIso();
  orderedIds.forEach((taskId, index) => {
    db.update(tasks)
      .set({ manualSortOrder: index, updatedAt: ts })
      .where(eq(tasks.id, taskId))
      .run();
  });
  return listTasks(undefined, "manual");
}

export function reorderSubtasks(taskId: string, orderedIds: string[]) {
  const db = getDb();
  const existing = listSubtasks(taskId);
  const idSet = new Set(existing.map((s) => s.id));
  if (
    orderedIds.length !== existing.length ||
    !orderedIds.every((id) => idSet.has(id))
  ) {
    return null;
  }

  orderedIds.forEach((subtaskId, index) => {
    db.update(subtasks)
      .set({ sortOrder: index })
      .where(eq(subtasks.id, subtaskId))
      .run();
  });

  return listSubtasks(taskId);
}
