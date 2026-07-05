import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { northStars, strategicPillars, subtasks, tasks } from "@/lib/db/schema";
import type { Subtask, Task } from "@/lib/db/schema";
import { generateBreakdown } from "@/lib/ai/breakdown";
import {
  computeSubtaskDiff,
  hasSubtaskDiffChanges,
  resolveProposedSubtasks,
  type BreakdownPreviewResult,
  type ProposedSubtask,
} from "@/lib/tasks/subtask-diff";
import { sumSubtaskEstimatedMin } from "@/lib/tasks/subtask-estimates";
import { id, nowIso } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { fetchTaskById } from "./fetch";
import { listSubtasks } from "./subtasks";
import {
  scopedPillarId,
  scopedSubtaskId,
  scopedSubtaskIds,
  scopedTaskId,
} from "./scoped";

export type BreakdownPreviewResponse = BreakdownPreviewResult;

export type BreakdownAppliedResponse = {
  preview: false;
  task: Task | null | undefined;
  subtasks: Subtask[];
  breakdown: Awaited<ReturnType<typeof generateBreakdown>>;
};

export async function breakdownTask(
  taskId: string,
  options: { userPrompt?: string; userId: string },
) {
  const preview = await previewBreakdownTask(taskId, options);
  if (preview.preview) {
    throw new Error("Breakdown requires confirmation when subtasks already exist");
  }
  return preview;
}

export async function previewBreakdownTask(
  taskId: string,
  options: { userPrompt?: string; userId: string },
): Promise<BreakdownPreviewResponse | BreakdownAppliedResponse> {
  await ensureDbReady();
  const db = getDb();
  const task = await fetchTaskById(taskId, options.userId);
  if (!task) {
    return { preview: false, task: null, subtasks: [], breakdown: null as never };
  }

  const existing = await listSubtasks(taskId, options.userId);
  const stars = await db
    .select()
    .from(northStars)
    .where(eq(northStars.userId, options.userId));
  const pillar = task.pillarId
    ? (
        await db
          .select()
          .from(strategicPillars)
          .where(scopedPillarId(task.pillarId, options.userId))
      )[0]
    : null;

  const breakdown = await generateBreakdown(task.title, task.description, {
    northStar: stars[0]?.statement,
    pillar: pillar?.name,
    userPrompt: options.userPrompt,
    existingSubtasks: existing.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      isDone: subtask.isDone,
    })),
  });

  const proposed = resolveProposedSubtasks(existing, breakdown.subtasks);
  const diff = computeSubtaskDiff(existing, proposed);

  if (existing.length === 0 || !hasSubtaskDiffChanges(diff)) {
    return applyBreakdownPreview(taskId, proposed, options.userId, breakdown);
  }

  return {
    preview: true,
    diff,
    proposed,
    summary: breakdown.summary,
    source: breakdown.source,
    noChanges: !hasSubtaskDiffChanges(diff),
    estimatedMinTotal: breakdown.estimatedMinTotal,
  };
}

export async function applyBreakdownPreview(
  taskId: string,
  proposed: ProposedSubtask[],
  userId: string,
  breakdown?: Awaited<ReturnType<typeof generateBreakdown>>,
): Promise<BreakdownAppliedResponse> {
  await ensureDbReady();
  const db = getDb();
  const task = await fetchTaskById(taskId, userId);
  if (!task) {
    return { preview: false, task: null, subtasks: [], breakdown: breakdown as never };
  }

  const existing = await listSubtasks(taskId, userId);
  const existingById = new Map(existing.map((subtask) => [subtask.id, subtask]));
  const keepIds = new Set(
    proposed.map((item) => item.existingId).filter(Boolean) as string[],
  );
  const deleteIds = existing
    .filter((subtask) => !keepIds.has(subtask.id))
    .map((subtask) => subtask.id);

  const ts = nowIso();
  const inserts: (typeof subtasks.$inferInsert)[] = [];
  const updates: { id: string; patch: Partial<typeof subtasks.$inferInsert> }[] =
    [];

  for (const [sortOrder, item] of proposed.entries()) {
    const title = item.title.trim();
    if (item.existingId && keepIds.has(item.existingId)) {
      const current = existingById.get(item.existingId);
      if (!current) continue;

      const patch: Partial<typeof subtasks.$inferInsert> = {};
      if (current.sortOrder !== sortOrder) {
        patch.sortOrder = sortOrder;
      }
      if (current.title !== title) {
        patch.title = title;
      }
      if (
        item.estimatedMin !== undefined &&
        current.estimatedMin !== item.estimatedMin
      ) {
        patch.estimatedMin = item.estimatedMin;
      }
      if (Object.keys(patch).length > 0) {
        updates.push({ id: item.existingId, patch });
      }
      continue;
    }

    inserts.push({
      id: id(),
      userId: userId ?? task.userId!,
      parentTaskId: taskId,
      title,
      sortOrder,
      isDone: false,
      estimatedMin: item.estimatedMin ?? null,
      createdAt: ts,
    });
  }

  await db.transaction(async (tx) => {
    if (deleteIds.length > 0) {
      await tx.delete(subtasks).where(scopedSubtaskIds(deleteIds, userId));
    }

    for (const { id: subtaskId, patch } of updates) {
      await tx
        .update(subtasks)
        .set(patch)
        .where(scopedSubtaskId(subtaskId, userId));
    }

    if (inserts.length > 0) {
      await tx.insert(subtasks).values(inserts);
    }

    if (breakdown) {
      await tx
        .update(tasks)
        .set({
          intimidationScore: breakdown.intimidationScore ?? task.intimidationScore,
          updatedAt: ts,
        })
        .where(scopedTaskId(taskId, userId));
    } else {
      await tx
        .update(tasks)
        .set({ updatedAt: ts })
        .where(scopedTaskId(taskId, userId));
    }
  });

  const syncedSubtasks = await listSubtasks(taskId, userId);
  const estimatedMin = sumSubtaskEstimatedMin(syncedSubtasks);
  if (syncedSubtasks.length > 0) {
    await db
      .update(tasks)
      .set({ estimatedMin, updatedAt: nowIso() })
      .where(scopedTaskId(taskId, userId));
  }

  return {
    preview: false,
    task: await fetchTaskById(taskId, userId),
    subtasks: await listSubtasks(taskId, userId),
    breakdown: breakdown ?? (null as never),
  };
}
