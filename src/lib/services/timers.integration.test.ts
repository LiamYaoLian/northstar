import { describe, expect, it, beforeAll, afterEach } from "vitest";
import { ensureDbReady, getDb } from "@/lib/db";
import {
  activeTimeSessions,
  tasks,
  timeEntries,
  users,
} from "@/lib/db/schema";
import { id, nowIso } from "@/lib/utils";
import { createTask } from "@/lib/services/tasks";
import { saveStrategy } from "@/lib/services/strategy";
import {
  TimerAlreadyRunningError,
  TimerInvalidInputError,
  TimerNotFoundError,
  TimerTaskDeletedError,
  TimerTaskNotFoundError,
} from "@/lib/services/timer-errors";
import {
  cancelTimer,
  getActiveTimer,
  startTimer,
  stopTimer,
} from "@/lib/services/timers";
import { eq } from "drizzle-orm";

async function createTestUser(label: string) {
  const userId = id();
  const ts = nowIso();
  await getDb().insert(users).values({
    id: userId,
    name: `Timer test ${label}`,
    email: `timer-${label}-${userId}@example.com`,
    emailVerified: null,
    image: null,
    createdAt: ts,
    updatedAt: ts,
  });
  return userId;
}

function strategyInput(label: string) {
  return {
    statement: `${label} north star`,
    horizon: "2026 Q4",
    hoursPerWeek: 40,
    pillars: [
      {
        name: "工作",
        targetPct: 100,
        color: "#3b82f6",
        keywords: ["work"],
      },
    ],
    source: "timer_test",
  };
}

const createdUserIds: string[] = [];

async function setupUserWithTask(label: string) {
  const userId = await createTestUser(label);
  createdUserIds.push(userId);
  await saveStrategy(userId, strategyInput(label));
  const task = await createTask(
    { title: `Timer task ${label}`, autoBreakdown: false },
    userId,
  );
  if (!task) throw new Error("failed to create task");
  return { userId, taskId: task.id };
}

function pastIso(secondsAgo: number) {
  return new Date(Date.now() - secondsAgo * 1000).toISOString();
}

describe.sequential("timers service", () => {
  beforeAll(async () => {
    await ensureDbReady();
  });

  afterEach(async () => {
    for (const userId of createdUserIds) {
      await cancelTimer(userId).catch(() => {});
    }
    createdUserIds.length = 0;
  });

  it("starts stopwatch session and returns task summary", async () => {
    const { userId, taskId } = await setupUserWithTask("stopwatch");

    const active = await startTimer({ taskId, mode: "stopwatch" }, userId);

    expect(active.session.mode).toBe("stopwatch");
    expect(active.session.targetDurationMin).toBeNull();
    expect(active.task?.id).toBe(taskId);
    expect(active.task?.title).toContain("Timer task stopwatch");
    expect(active.serverNow).toBeTruthy();
  });

  it("starts pomodoro session with target duration", async () => {
    const { userId, taskId } = await setupUserWithTask("pomodoro");

    const active = await startTimer(
      { taskId, mode: "pomodoro", targetDurationMin: 25 },
      userId,
    );

    expect(active.session.mode).toBe("pomodoro");
    expect(active.session.targetDurationMin).toBe(25);
  });

  it("stopwatch stop writes timer time entry with rounded duration", async () => {
    const { userId, taskId } = await setupUserWithTask("stop");
    const startedAt = pastIso(90);
    const sessionId = id();
    const ts = nowIso();
    await getDb().insert(activeTimeSessions).values({
      id: sessionId,
      userId,
      taskId,
      mode: "stopwatch",
      startedAt,
      targetDurationMin: null,
      note: null,
      createdAt: ts,
      updatedAt: ts,
    });

    const entry = await stopTimer(userId);

    expect(entry).not.toBeNull();
    expect(entry!.source).toBe("timer");
    expect(entry!.taskId).toBe(taskId);
    expect(entry!.startedAt).toBe(startedAt);
    expect(entry!.durationMin).toBe(2);
    expect(await getActiveTimer(userId)).toBeNull();
  });

  it("pomodoro stop records actual elapsed including overtime", async () => {
    const { userId, taskId } = await setupUserWithTask("pomodoro-stop");
    const startedAt = pastIso(26 * 60);
    const ts = nowIso();
    await getDb().insert(activeTimeSessions).values({
      id: id(),
      userId,
      taskId,
      mode: "pomodoro",
      startedAt,
      targetDurationMin: 25,
      note: null,
      createdAt: ts,
      updatedAt: ts,
    });

    const entry = await stopTimer(userId);

    expect(entry!.durationMin).toBe(26);
    expect(entry!.source).toBe("timer");
  });

  it("rejects starting when a session is already active", async () => {
    const { userId, taskId } = await setupUserWithTask("conflict");
    const other = await createTask(
      { title: "Other task", autoBreakdown: false },
      userId,
    );

    await startTimer({ taskId, mode: "stopwatch" }, userId);

    await expect(
      startTimer({ taskId: other!.id, mode: "stopwatch" }, userId),
    ).rejects.toBeInstanceOf(TimerAlreadyRunningError);
  });

  it("cancel removes session without writing time entry", async () => {
    const { userId, taskId } = await setupUserWithTask("cancel");
    const before = (await listEntries(userId)).length;

    await startTimer({ taskId, mode: "stopwatch" }, userId);
    await cancelTimer(userId);

    expect(await getActiveTimer(userId)).toBeNull();
    expect((await listEntries(userId)).length).toBe(before);
  });

  it("rejects starting on another user's task", async () => {
    const a = await setupUserWithTask("owner-a");
    const b = await setupUserWithTask("owner-b");

    await expect(
      startTimer({ taskId: b.taskId, mode: "stopwatch" }, a.userId),
    ).rejects.toBeInstanceOf(TimerTaskNotFoundError);
  });

  it("stop with deleted task clears orphan session and throws", async () => {
    const { userId, taskId } = await setupUserWithTask("deleted-task");
    const ts = nowIso();
    await getDb().insert(activeTimeSessions).values({
      id: id(),
      userId,
      taskId,
      mode: "stopwatch",
      startedAt: pastIso(120),
      targetDurationMin: null,
      note: null,
      createdAt: ts,
      updatedAt: ts,
    });
    await getDb().delete(tasks).where(eq(tasks.id, taskId));

    await expect(stopTimer(userId)).rejects.toBeInstanceOf(TimerTaskDeletedError);
    expect(await getActiveTimer(userId)).toBeNull();
  });

  it("stop without active session throws not found", async () => {
    const { userId } = await setupUserWithTask("no-session");

    await expect(stopTimer(userId)).rejects.toBeInstanceOf(TimerNotFoundError);
  });

  it("cancel without active session throws not found", async () => {
    const { userId } = await setupUserWithTask("no-cancel");

    await expect(cancelTimer(userId)).rejects.toBeInstanceOf(TimerNotFoundError);
  });

  it("getActiveTimer returns null task when task was deleted", async () => {
    const { userId, taskId } = await setupUserWithTask("orphan-get");
    await startTimer({ taskId, mode: "stopwatch" }, userId);
    await getDb().delete(tasks).where(eq(tasks.id, taskId));

    const active = await getActiveTimer(userId);

    expect(active?.session.taskId).toBe(taskId);
    expect(active?.task).toBeNull();
  });

  it("rejects invalid pomodoro input without target duration", async () => {
    const { userId, taskId } = await setupUserWithTask("invalid-pomodoro");

    await expect(
      startTimer({ taskId, mode: "pomodoro" }, userId),
    ).rejects.toBeInstanceOf(TimerInvalidInputError);
  });

  it("records at least 1 minute for very short sessions", async () => {
    const { userId, taskId } = await setupUserWithTask("short");
    const ts = nowIso();
    await getDb().insert(activeTimeSessions).values({
      id: id(),
      userId,
      taskId,
      mode: "stopwatch",
      startedAt: pastIso(29),
      targetDurationMin: null,
      note: null,
      createdAt: ts,
      updatedAt: ts,
    });

    const entry = await stopTimer(userId);

    expect(entry!.durationMin).toBe(1);
  });
});

describe.sequential("timer auth isolation", () => {
  afterEach(async () => {
    for (const userId of createdUserIds) {
      await cancelTimer(userId).catch(() => {});
    }
    createdUserIds.length = 0;
  });

  it("requires task ownership to start a timer", async () => {
    const userA = await setupUserWithTask("auth-a");
    const userB = await setupUserWithTask("auth-b");

    await expect(
      startTimer({ taskId: userB.taskId, mode: "stopwatch" }, userA.userId),
    ).rejects.toBeInstanceOf(TimerTaskNotFoundError);
  });

  it("does not let another user stop an active session", async () => {
    const userA = await setupUserWithTask("auth-stop-a");
    const userB = await setupUserWithTask("auth-stop-b");

    await startTimer({ taskId: userA.taskId, mode: "stopwatch" }, userA.userId);

    await expect(stopTimer(userB.userId)).rejects.toBeInstanceOf(TimerNotFoundError);
    expect(await getActiveTimer(userA.userId)).not.toBeNull();
  });

  it("returns conflict payload when restarting on same user", async () => {
    const { userId, taskId } = await setupUserWithTask("auth-conflict");
    const other = await createTask(
      { title: "Other task", autoBreakdown: false },
      userId,
    );

    const first = await startTimer({ taskId, mode: "stopwatch" }, userId);

    try {
      await startTimer({ taskId: other!.id, mode: "stopwatch" }, userId);
      expect.fail("expected conflict");
    } catch (err) {
      expect(err).toBeInstanceOf(TimerAlreadyRunningError);
      expect((err as TimerAlreadyRunningError).active.session.id).toBe(
        first.session.id,
      );
    }
  });

  it("cancel is scoped to the current user session", async () => {
    const userA = await setupUserWithTask("auth-cancel-a");
    const userB = await setupUserWithTask("auth-cancel-b");

    await startTimer({ taskId: userA.taskId, mode: "stopwatch" }, userA.userId);

    await expect(cancelTimer(userB.userId)).rejects.toBeInstanceOf(TimerNotFoundError);
    expect(await getActiveTimer(userA.userId)).not.toBeNull();

    await cancelTimer(userA.userId);
    expect(await getActiveTimer(userA.userId)).toBeNull();
  });
});

async function listEntries(userId: string) {
  return getDb()
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.userId, userId));
}
