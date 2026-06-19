import { beforeAll, describe, expect, it } from "vitest";
import { ensureDbReady, getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createTask, updateTask } from "@/lib/services/tasks";
import { id, nowIso } from "@/lib/utils";

const TEST_TZ = "America/New_York";

async function createTestUser(label: string) {
  const userId = id();
  const ts = nowIso();
  await getDb().insert(users).values({
    id: userId,
    name: `Create task ${label}`,
    email: `create-task-${label}-${userId}@example.com`,
    emailVerified: null,
    image: null,
    createdAt: ts,
    updatedAt: ts,
  });
  return userId;
}

describe("createTask startAt", () => {
  beforeAll(async () => {
    await ensureDbReady();
  });

  it("stores null startAt when explicitly null", async () => {
    const userId = await createTestUser("null-start");
    const task = await createTask(
      { title: "Unscheduled task", startAt: null, autoBreakdown: false },
      userId,
      { tz: TEST_TZ },
    );
    expect(task?.startAt).toBeNull();
  });

  it("defaults startAt when omitted", async () => {
    const userId = await createTestUser("default-start");
    const task = await createTask(
      { title: "Default start task", autoBreakdown: false },
      userId,
      { tz: TEST_TZ },
    );
    expect(task?.startAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("clears startAt via updateTask", async () => {
    const userId = await createTestUser("clear-start");
    const created = await createTask(
      {
        title: "Scheduled then cleared",
        startAt: "2025-06-18",
        autoBreakdown: false,
      },
      userId,
      { tz: TEST_TZ },
    );
    expect(created?.startAt).not.toBeNull();

    const updated = await updateTask(
      created!.id,
      { startAt: null },
      { userId, tz: TEST_TZ },
    );
    expect(updated?.startAt).toBeNull();
  });
});
