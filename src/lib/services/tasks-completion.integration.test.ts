import { describe, it, expect, beforeAll } from "vitest";
import { ensureDbReady, getDb } from "@/lib/db";
import { updateTask } from "@/lib/services/tasks";
import { taskCompletionEvents, tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("updateTask writes completion events", () => {
  let taskId: string;

  beforeAll(async () => {
    await ensureDbReady();
    const row = (await getDb().select().from(tasks).limit(1))[0];
    if (!row) throw new Error("no tasks in test database");
    taskId = row.id;
    if (row.status === "done") {
      await updateTask(taskId, { status: "todo" }, { tz: "America/Toronto" });
    }
  });

  it("inserts task_completion_events when marking done", async () => {
    await updateTask(taskId, { status: "done" }, { tz: "America/Toronto" });
    const events = await getDb()
      .select()
      .from(taskCompletionEvents)
      .where(eq(taskCompletionEvents.taskId, taskId));
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.taskTitle.length > 0)).toBe(true);
  });
});
