import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { subtasks, timeEntries } from "@/lib/db/schema";
import { id, nowIso } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { fetchTaskById, fetchTimeEntryById } from "./fetch";

export async function addTimeEntry(
  input: {
    taskId: string;
    durationMin: number;
    source?: string;
    note?: string;
    startedAt?: string;
  },
  userId: string,
) {
  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const task = await fetchTaskById(input.taskId, userId);
  if (!task) return null;
  const entryId = id();
  await db.insert(timeEntries).values({
    id: entryId,
    userId: userId ?? task.userId ?? null,
    taskId: input.taskId,
    startedAt: input.startedAt ?? ts,
    durationMin: input.durationMin,
    source: input.source ?? "manual",
    note: input.note ?? null,
    createdAt: ts,
  });

  return fetchTimeEntryById(entryId, userId);
}

export async function listTimeEntries(userId: string) {
  await ensureDbReady();
  return getDb()
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.userId, userId));
}
