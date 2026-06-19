import "server-only";

import type { getDb } from "@/lib/db";
import { strategicPillars } from "@/lib/db/schema";
import type { StrategicPillar, Task } from "@/lib/db/schema";
import { findWorkPillar, isWorkPillar } from "@/lib/pillars";
import { assertAssignableProject } from "@/lib/services/projects";
import type { ClassifyResult } from "@/lib/tasks/classify";
import type { RecurrenceInference } from "@/lib/tasks/infer-recurrence";
import {
  resolveCreateFocusTrack,
  shouldClearProjectIdOnPillarChange,
} from "@/lib/tasks/project-domain";
import {
  isValidTaskDateRange,
  normalizeTaskDate,
  normalizeTaskStartAt,
} from "@/lib/tasks/task-dates";
import type { RecurrenceType } from "@/lib/tasks/recurrence-types";
import {
  recurrenceTypeUsesDays,
  serializeRecurrenceDays,
} from "@/lib/tasks/recurrence-types";
import { eq } from "drizzle-orm";
import { scopedPillarId } from "./scoped";

export function resolveCreateClassification(
  input: { pillarId?: string; focusTrack?: string; projectId?: string },
  pillars: StrategicPillar[],
  classified: ClassifyResult,
  projectFocusTrack: string | null,
  resolvedPillarId: string | null,
) {
  const workPillar = findWorkPillar(pillars);
  const focusTrack = resolveCreateFocusTrack({
    explicitFocusTrack: input.focusTrack,
    classifiedFocusTrack: classified.focusTrack,
    projectFocusTrack,
    pillarId: resolvedPillarId,
    workPillarId: workPillar?.id,
  });

  return { focusTrack };
}

export function resolveCreateRecurrence(
  input: {
    recurrenceType?: RecurrenceType;
    recurrenceDays?: number[] | null;
    recurrenceCarryOver?: boolean;
  },
  inferred: RecurrenceInference,
): {
  recurrenceType: RecurrenceType;
  recurrenceDays: number[] | null;
  recurrenceCarryOver: boolean;
} {
  if (input.recurrenceType === undefined) {
    return {
      recurrenceType: inferred.recurrenceType,
      recurrenceDays:
        recurrenceTypeUsesDays(inferred.recurrenceType) &&
        inferred.recurrenceDays.length
          ? inferred.recurrenceDays
          : null,
      recurrenceCarryOver:
        inferred.recurrenceType === "weekly"
          ? inferred.recurrenceCarryOver
          : false,
    };
  }

  const recurrenceType = input.recurrenceType;
  return {
    recurrenceType,
    recurrenceDays:
      recurrenceTypeUsesDays(recurrenceType) && input.recurrenceDays?.length
        ? input.recurrenceDays
        : null,
    recurrenceCarryOver:
      recurrenceType === "weekly"
        ? Boolean(input.recurrenceCarryOver)
        : false,
  };
}

export type TaskUpdatePatch = Partial<{
  title: string;
  status: string;
  pillarId: string | null;
  focusTrack: string | null;
  projectId: string | null;
  intimidationScore: number;
  estimatedMin: number | null;
  startAt: string | null;
  dueAt: string | null;
  recurrenceType: RecurrenceType;
  recurrenceDays: number[] | null;
  recurrenceCarryOver: boolean;
}>;

export async function buildTaskPatch(
  db: ReturnType<typeof getDb>,
  existing: Task,
  patch: TaskUpdatePatch,
  userId: string,
  tz?: string,
) {
  const {
    intimidationScore,
    estimatedMin,
    startAt,
    dueAt,
    pillarId,
    focusTrack,
    projectId,
    recurrenceType,
    recurrenceDays,
    recurrenceCarryOver,
    ...rest
  } = patch;
  const safePatch: Record<string, unknown> = {
    ...rest,
    ...(intimidationScore != null
      ? { intimidationScore: Math.min(5, Math.max(1, intimidationScore)) }
      : {}),
  };

  if (estimatedMin !== undefined) {
    if (
      estimatedMin === null ||
      (Number.isInteger(estimatedMin) && estimatedMin > 0)
    ) {
      safePatch.estimatedMin = estimatedMin;
    }
  }

  if (startAt !== undefined) {
    safePatch.startAt = normalizeTaskStartAt(startAt, tz);
  }

  const nextRecurrenceType =
    recurrenceType ?? existing.recurrenceType ?? "none";

  if (dueAt !== undefined) {
    safePatch.dueAt =
      nextRecurrenceType !== "none" ? null : normalizeTaskDate(dueAt);
  }

  const effectiveStart = normalizeTaskStartAt(
    (safePatch.startAt as string | null | undefined) ?? existing.startAt,
    tz,
  );
  const effectiveDue = normalizeTaskDate(
    (safePatch.dueAt as string | null | undefined) ?? existing.dueAt,
  );
  if (!isValidTaskDateRange(effectiveStart, effectiveDue, tz)) {
    return null;
  }

  if (recurrenceType !== undefined) {
    safePatch.recurrenceType = recurrenceType;
  }
  if (recurrenceDays !== undefined) {
    safePatch.recurrenceDays = serializeRecurrenceDays(
      nextRecurrenceType as RecurrenceType,
      recurrenceDays,
    );
  }
  if (recurrenceCarryOver !== undefined || recurrenceType !== undefined) {
    safePatch.recurrenceCarryOver =
      nextRecurrenceType === "weekly"
        ? Boolean(recurrenceCarryOver ?? existing.recurrenceCarryOver)
        : false;
  }
  if (
    recurrenceType !== undefined ||
    recurrenceDays !== undefined ||
    recurrenceCarryOver !== undefined
  ) {
    if (nextRecurrenceType !== "none") {
      safePatch.dueAt = null;
    }
  }

  const needsWorkPillarContext =
    pillarId !== undefined || projectId !== undefined;
  let workPillar: ReturnType<typeof findWorkPillar> | undefined;

  if (needsWorkPillarContext) {
    const pillarRows = db.select().from(strategicPillars);
    const pillars = userId
      ? await pillarRows.where(eq(strategicPillars.userId, userId))
      : await pillarRows;
    workPillar = findWorkPillar(pillars);
  }

  if (pillarId !== undefined) {
    if (pillarId === null) {
      safePatch.pillarId = null;
      if (focusTrack === undefined) safePatch.focusTrack = null;
      safePatch.projectId = null;
    } else {
      const pillar = (
        await db
          .select()
          .from(strategicPillars)
          .where(scopedPillarId(pillarId, userId))
      )[0];
      if (!pillar) return null;
      safePatch.pillarId = pillarId;
      if (!isWorkPillar(pillar, workPillar) && focusTrack === undefined) {
        safePatch.focusTrack = null;
      }
      if (shouldClearProjectIdOnPillarChange(pillarId, workPillar?.id)) {
        safePatch.projectId = null;
      }
    }
  }

  if (focusTrack !== undefined) {
    safePatch.focusTrack = focusTrack;
  }

  if (projectId !== undefined) {
    if (projectId === null) {
      safePatch.projectId = null;
    } else {
      const effectivePillarId =
        (safePatch.pillarId as string | null | undefined) ?? existing.pillarId;
      await assertAssignableProject(projectId, effectivePillarId, userId, db);
      safePatch.projectId = projectId;
    }
  }

  return safePatch;
}
