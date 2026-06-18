import { describe, it, expect, beforeAll } from "vitest";
import { ensureDbReady, getDb } from "@/lib/db";
import { updateTask } from "@/lib/services/tasks";
import { tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("defer task", () => {
  let taskId: string;

  beforeAll(async () => {
    await ensureDbReady();
    const row = (await getDb().select().from(tasks).limit(1))[0];
    if (!row) throw new Error("no tasks in test database");
    taskId = row.id;
    if (row.status !== "todo") {
      await updateTask(taskId, { status: "todo" }, { tz: "America/Toronto" });
    }
  });

  it("sets deferred status and increments postponedCount", async () => {
    const before = (await getDb().select().from(tasks).where(eq(tasks.id, taskId)))[0]!;
    const countBefore = before.postponedCount;

    await updateTask(taskId, { status: "deferred" }, { tz: "America/Toronto" });
    const deferred = (await getDb().select().from(tasks).where(eq(tasks.id, taskId)))[0]!;
    expect(deferred.status).toBe("deferred");
    expect(deferred.postponedCount).toBe(countBefore + 1);

    await updateTask(taskId, { status: "todo" }, { tz: "America/Toronto" });
    const restored = (await getDb().select().from(tasks).where(eq(tasks.id, taskId)))[0]!;
    expect(restored.status).toBe("todo");
    expect(restored.postponedCount).toBe(countBefore + 1);
  });
});
