import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { strategicPillars, tasks } from "@/lib/db/schema";
import { shouldAutoBreakdown } from "@/lib/ai/breakdown";
import {
  getProjectById,
  ProjectValidationError,
} from "@/lib/services/projects";
import { analyzeTaskTitle } from "@/lib/tasks/analyze";
import {
  isValidTaskDateRange,
  normalizeTaskDate,
  resolveTaskStartAt,
} from "@/lib/tasks/task-dates";
import type { RecurrenceType } from "@/lib/tasks/recurrence-types";
import { serializeRecurrenceDays } from "@/lib/tasks/recurrence-types";
import { resolveTimezone } from "@/lib/tasks/timezone";
import { id, nowIso } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { breakdownTask } from "./breakdown";
import { fetchTaskById } from "./fetch";
import {
  resolveCreateClassification,
  resolveCreateRecurrence,
} from "./patch";

export async function createTask(
  input: {
    title: string;
    description?: string;
    pillarId?: string;
    focusTrack?: string;
    projectId?: string;
    estimatedMin?: number;
    startAt?: string | null;
    dueAt?: string | null;
    intimidationScore?: number;
    autoBreakdown?: boolean;
    recurrenceType?: RecurrenceType;
    recurrenceDays?: number[] | null;
    recurrenceCarryOver?: boolean;
  },
  userId: string,
  options?: { tz?: string },
) {
  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const resolvedTz = resolveTimezone(options?.tz);
  const pillarRows = db.select().from(strategicPillars);
  const pillars = await pillarRows.where(eq(strategicPillars.userId, userId));
  const {
    classification: classified,
    estimate,
    recurrence: inferredRecurrence,
  } = await analyzeTaskTitle(input.title, pillars);
  let pillarId = input.pillarId ?? classified.pillarId ?? null;
  let project: Awaited<ReturnType<typeof getProjectById>> | null = null;
  if (input.projectId) {
    project = await getProjectById(input.projectId, userId);
    if (!project || project.status !== "active") {
      throw new ProjectValidationError("Archived projects cannot be assigned");
    }
    if (pillarId && pillarId !== project.pillarId) {
      throw new ProjectValidationError("Task pillar must match project pillar");
    }
    pillarId = pillarId ?? project.pillarId;
  }
  const { focusTrack } = resolveCreateClassification(
    input,
    pillars,
    classified,
    project?.focusTrack ?? null,
    pillarId,
  );
  const resolvedRecurrence = resolveCreateRecurrence(input, inferredRecurrence);

  const taskId = id();
  const recurrenceType = resolvedRecurrence.recurrenceType;
  const recurrenceDays = serializeRecurrenceDays(
    recurrenceType,
    resolvedRecurrence.recurrenceDays,
  );
  const recurrenceCarryOver =
    recurrenceType === "weekly"
      ? Boolean(resolvedRecurrence.recurrenceCarryOver)
      : false;

  const normalizedStart =
    input.startAt === null
      ? null
      : resolveTaskStartAt(input.startAt, resolvedTz);
  const normalizedDue =
    recurrenceType !== "none" ? null : normalizeTaskDate(input.dueAt);
  if (!isValidTaskDateRange(normalizedStart, normalizedDue, resolvedTz)) {
    throw new Error("Start date must be on or before due date");
  }

  await db.insert(tasks).values({
    id: taskId,
    userId,
    title: input.title,
    description: input.description ?? null,
    pillarId,
    focusTrack,
    projectId: project?.id ?? null,
    status: "todo",
    intimidationScore: input.intimidationScore ?? 2,
    estimatedMin: input.estimatedMin ?? estimate.estimatedMin ?? null,
    startAt: normalizedStart,
    dueAt: normalizedDue,
    recurrenceType,
    recurrenceDays,
    recurrenceCarryOver,
    createdAt: ts,
    updatedAt: ts,
  });

  if (
    input.autoBreakdown !== false &&
    shouldAutoBreakdown(input.title, input.intimidationScore)
  ) {
    await breakdownTask(taskId, { userId });
  }

  return fetchTaskById(taskId, userId);
}
