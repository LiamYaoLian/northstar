import { describe, expect, it, beforeAll } from "vitest";
import { ensureDbReady, getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { id, nowIso } from "@/lib/utils";
import { getStrategy, saveStrategy } from "@/lib/services/strategy";
import {
  addTimeEntry,
  createTask,
  deleteTask,
  listTasks,
  listTimeEntries,
  updateTask,
} from "@/lib/services/tasks";
import { listCompletionEvents } from "@/lib/services/completions";

async function createTestUser(label: string) {
  const userId = id();
  const ts = nowIso();
  await getDb().insert(users).values({
    id: userId,
    name: `Auth isolation ${label}`,
    email: `auth-isolation-${label}-${userId}@example.com`,
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
        targetPct: 60,
        color: "#3b82f6",
        keywords: ["work"],
        focusTracks: [{ name: "进大厂", shareOfParent: 100 }],
      },
      {
        name: "健康",
        targetPct: 40,
        color: "#22c55e",
        keywords: ["health"],
      },
    ],
    source: "auth_isolation_test",
  };
}

describe("auth-plan user isolation", () => {
  beforeAll(async () => {
    await ensureDbReady();
  });

  it("keeps strategies scoped per user", async () => {
    const userA = await createTestUser("strategy-a");
    const userB = await createTestUser("strategy-b");

    await saveStrategy(userA, strategyInput("user A"));
    await saveStrategy(userB, strategyInput("user B"));

    expect((await getStrategy(userA))?.northStar.statement).toBe("user A north star");
    expect((await getStrategy(userB))?.northStar.statement).toBe("user B north star");
  });

  it("lists only current-user tasks", async () => {
    const userA = await createTestUser("tasks-a");
    const userB = await createTestUser("tasks-b");
    await saveStrategy(userA, strategyInput("tasks A"));
    await saveStrategy(userB, strategyInput("tasks B"));

    const taskA = await createTask(
      { title: "Task only A can see", autoBreakdown: false },
      userA,
    );
    const taskB = await createTask(
      { title: "Task only B can see", autoBreakdown: false },
      userB,
    );

    const tz = "America/New_York";
    expect((await listTasks(userA, undefined, tz)).map((t) => t.id)).toContain(
      taskA?.id,
    );
    expect((await listTasks(userA, undefined, tz)).map((t) => t.id)).not.toContain(
      taskB?.id,
    );
  });

  it("requires task ownership when writing time entries", async () => {
    const userA = await createTestUser("time-a");
    const userB = await createTestUser("time-b");
    await saveStrategy(userB, strategyInput("time B"));
    const taskB = await createTask(
      { title: "B owns this task", autoBreakdown: false },
      userB,
    );

    const rejected = await addTimeEntry(
      { taskId: taskB!.id, durationMin: 15 },
      userA,
    );
    expect(rejected).toBeNull();
    expect(await listTimeEntries(userA)).toHaveLength(0);
  });

  it("keeps completion events scoped per user", async () => {
    const userA = await createTestUser("completion-a");
    const userB = await createTestUser("completion-b");
    await saveStrategy(userA, strategyInput("completion A"));
    await saveStrategy(userB, strategyInput("completion B"));
    const taskB = await createTask(
      { title: "B completion", autoBreakdown: false },
      userB,
    );

    await updateTask(taskB!.id, { status: "done" }, { userId: userB });

    const query = {
      since: "2000-01-01",
      until: "2099-12-31",
      tz: "America/Toronto",
    };
    expect(await listCompletionEvents({ ...query, userId: userA })).toHaveLength(0);
    expect(await listCompletionEvents({ ...query, userId: userB })).toHaveLength(1);
  });

  it("refuses to update another user's task", async () => {
    const userA = await createTestUser("patch-a");
    const userB = await createTestUser("patch-b");
    await saveStrategy(userA, strategyInput("patch A"));
    await saveStrategy(userB, strategyInput("patch B"));
    const taskB = await createTask(
      { title: "B only patch", autoBreakdown: false },
      userB,
    );

    const tz = "America/New_York";
    const updated = await updateTask(
      taskB!.id,
      { title: "Hijacked" },
      { tz, userId: userA },
    );
    expect(updated).toBeNull();
  });

  it("refuses to delete another user's task", async () => {
    const userA = await createTestUser("delete-a");
    const userB = await createTestUser("delete-b");
    await saveStrategy(userB, strategyInput("delete B"));
    const taskB = await createTask(
      { title: "B only delete", autoBreakdown: false },
      userB,
    );

    expect(await deleteTask(taskB!.id, userA)).toBe(false);
    expect(
      (await listTasks(userB, undefined, "America/New_York")).some((t) => t.id === taskB?.id),
    ).toBe(true);
  });
});
