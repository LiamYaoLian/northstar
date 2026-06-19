import { describe, it, expect, beforeAll } from "vitest";
import { ensureDbReady, getDb } from "@/lib/db";
import { listCompletionEvents } from "@/lib/services/completions";
import { taskCompletionEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { anyUserIdWithStrategy } from "@/lib/test-helpers/auth";

describe("listCompletionEvents", () => {
  let userId: string;

  beforeAll(async () => {
    await ensureDbReady();
    userId = await anyUserIdWithStrategy();
  });

  it("returns rows that exist in task_completion_events", async () => {
    const rows = await getDb()
      .select()
      .from(taskCompletionEvents)
      .where(eq(taskCompletionEvents.userId, userId));
    const listed = await listCompletionEvents({
      since: "2000-01-01",
      until: "2099-12-31",
      tz: "America/Toronto",
      userId,
    });
    expect(listed.length).toBe(rows.length);
    if (rows.length > 0) {
      expect(listed[0]!.taskTitle).toBeTruthy();
    }
  });
});
