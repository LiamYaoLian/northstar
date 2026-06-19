import { describe, it, expect, beforeAll } from "vitest";
import { ensureDbReady, getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { openRecurringOccurrences, updateSubtask, updateTask } from "@/lib/services/tasks";
import { recordCompletionEvent } from "@/lib/services/completions";
import { subtasks, taskCompletionEvents, tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { id, nowIso } from "@/lib/utils";
import { anyUserIdWithStrategy } from "@/lib/test-helpers/auth";

const tz = "America/Toronto";

describe("updateTask writes completion events", () => {
  let taskId: string;
  let userId: string;

  beforeAll(async () => {
    await ensureDbReady();
    userId = await anyUserIdWithStrategy();
    const row = (
      await getDb()
        .select()
        .from(tasks)
        .where(eq(tasks.userId, userId))
        .limit(1)
    )[0];
    if (!row) throw new Error("no tasks in test database");
    taskId = row.id;
    if (row.status === "done") {
      await updateTask(taskId, { status: "todo" }, { tz, userId });
    }
  });

  it("inserts task_completion_events when marking done", async () => {
    await updateTask(taskId, { status: "done" }, { tz, userId });
    const events = await getDb()
      .select()
      .from(taskCompletionEvents)
      .where(eq(taskCompletionEvents.taskId, taskId));
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.taskTitle.length > 0)).toBe(true);
  });

  it("recordCompletionEvent is idempotent for same task_id+completed_at", async () => {
    const db = getDb();
    const task = (await db.select().from(tasks).where(eq(tasks.id, taskId)))[0]!;
    const countBefore = (
      await db
        .select()
        .from(taskCompletionEvents)
        .where(eq(taskCompletionEvents.taskId, taskId))
    ).length;

    await db.transaction(async (tx) => {
      await recordCompletionEvent(tx, userId, task, tz);
      await recordCompletionEvent(tx, userId, task, tz);
    });

    const events = await db
      .select()
      .from(taskCompletionEvents)
      .where(eq(taskCompletionEvents.taskId, taskId));
    expect(events).toHaveLength(countBefore);
  });
});

describe("updateTask undoes accidental completions", () => {
  let userId: string;

  beforeAll(async () => {
    await ensureDbReady();
    userId = id();
    const ts = nowIso();
    await getDb().insert(users).values({
      id: userId,
      name: "Completion undo test user",
      email: `completion-undo-${userId}@example.com`,
      emailVerified: null,
      image: null,
      createdAt: ts,
      updatedAt: ts,
    });
  });

  async function insertTask(
    overrides: Partial<typeof tasks.$inferInsert> = {},
  ): Promise<string> {
    const taskId = overrides.id ?? id();
    const ts = nowIso();
    await getDb().insert(tasks).values({
      id: taskId,
      userId,
      title: "Undo completion test",
      description: null,
      pillarId: null,
      focusTrack: null,
      status: "todo",
      intimidationScore: 2,
      estimatedMin: 30,
      dueAt: null,
      createdAt: ts,
      updatedAt: ts,
      completedAt: null,
      recurrenceType: "none",
      recurrenceDays: null,
      recurrenceCarryOver: false,
      ...overrides,
    });
    return taskId;
  }

  async function eventsForTask(taskId: string) {
    return getDb()
      .select()
      .from(taskCompletionEvents)
      .where(eq(taskCompletionEvents.taskId, taskId));
  }

  it("removes the current completion event when reopening a done task", async () => {
    const taskId = await insertTask();

    await updateTask(taskId, { status: "done" }, { tz, userId });
    const [event] = await eventsForTask(taskId);
    expect(event?.completedAt).toBeTruthy();

    await updateTask(taskId, { status: "todo" }, { tz, userId });

    expect(await eventsForTask(taskId)).toHaveLength(0);
  });

  it("reopens successfully when the matching completion event is already missing", async () => {
    const taskId = await insertTask();

    await updateTask(taskId, { status: "done" }, { tz, userId });
    const [event] = await eventsForTask(taskId);
    expect(event).toBeTruthy();
    await getDb()
      .delete(taskCompletionEvents)
      .where(eq(taskCompletionEvents.id, event!.id));

    const reopened = await updateTask(taskId, { status: "todo" }, { tz, userId });

    expect(reopened?.status).toBe("todo");
    expect(await eventsForTask(taskId)).toHaveLength(0);
  });

  it("removes auto-complete events from subtasks when reopening the parent task", async () => {
    const taskId = await insertTask();
    await getDb().insert(subtasks).values({
      id: id(),
      userId,
      parentTaskId: taskId,
      title: "Only subtask",
      sortOrder: 0,
      isDone: false,
      createdAt: nowIso(),
    });

    const [subtask] = await getDb()
      .select()
      .from(subtasks)
      .where(eq(subtasks.parentTaskId, taskId));
    await updateSubtask(subtask!.id, { isDone: true }, { tz, userId });
    expect(await eventsForTask(taskId)).toHaveLength(1);

    await updateTask(taskId, { status: "todo" }, { tz, userId });

    expect(await eventsForTask(taskId)).toHaveLength(0);
  });

  it("keeps historical recurring events during lazy reset", async () => {
    const completedAt = "2025-01-06T15:00:00.000Z";
    const taskId = await insertTask({
      status: "done",
      completedAt,
      recurrenceType: "daily",
    });
    const task = (await getDb().select().from(tasks).where(eq(tasks.id, taskId)))[0]!;
    await getDb().transaction(async (tx) => {
      await recordCompletionEvent(
        tx,
        userId,
        task,
        "America/New_York",
        new Date(completedAt),
      );
    });

    await openRecurringOccurrences(
      getDb(),
      "America/New_York",
      new Date("2025-01-07T15:00:00.000Z"),
      userId,
    );

    const [resetTask] = await getDb().select().from(tasks).where(eq(tasks.id, taskId));
    expect(resetTask?.status).toBe("todo");
    expect(await eventsForTask(taskId)).toHaveLength(1);
  });

  it("only removes the current recurring completion event on reopen", async () => {
    const previousCompletedAt = "2025-01-06T15:00:00.000Z";
    const currentCompletedAt = "2025-01-07T15:00:00.000Z";
    const taskId = await insertTask({
      status: "done",
      completedAt: currentCompletedAt,
      recurrenceType: "daily",
    });
    const task = (await getDb().select().from(tasks).where(eq(tasks.id, taskId)))[0]!;
    await getDb().transaction(async (tx) => {
      await recordCompletionEvent(
        tx,
        userId,
        { ...task, completedAt: previousCompletedAt },
        "America/New_York",
        new Date(previousCompletedAt),
      );
      await recordCompletionEvent(
        tx,
        userId,
        task,
        "America/New_York",
        new Date(currentCompletedAt),
      );
    });
    expect(await eventsForTask(taskId)).toHaveLength(2);

    await updateTask(taskId, { status: "todo" }, { tz: "America/New_York", userId });

    const remaining = await eventsForTask(taskId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.completedAt).toBe(previousCompletedAt);
    expect(
      remaining.some(
        (event) => event.taskId === taskId && event.completedAt === currentCompletedAt,
      ),
    ).toBe(false);
  });
});
