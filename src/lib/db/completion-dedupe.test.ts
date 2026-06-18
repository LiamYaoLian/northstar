import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/lib/db/schema";
import {
  addCompletionEventsTableIfMissing,
  dedupeCompletionEvents,
} from "@/lib/db/migrations";

describe("dedupeCompletionEvents", () => {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });

  beforeAll(async () => {
    await addCompletionEventsTableIfMissing(client);
  });

  it("removes duplicate task_id+completed_at rows", async () => {
    const ts = "2026-06-18T10:00:00.000Z";
    await db.insert(schema.taskCompletionEvents).values([
      {
        id: "e1",
        taskId: "t1",
        completedAt: ts,
        occurrenceDate: "2026-06-18",
        taskTitle: "A",
        pillarId: null,
        pillarName: null,
        pillarColor: null,
        focusTrack: null,
        recurrenceType: "none",
        createdAt: ts,
      },
      {
        id: "e2",
        taskId: "t1",
        completedAt: ts,
        occurrenceDate: "2026-06-18",
        taskTitle: "A",
        pillarId: null,
        pillarName: null,
        pillarColor: null,
        focusTrack: null,
        recurrenceType: "none",
        createdAt: ts,
      },
    ]);

    const removed = await dedupeCompletionEvents(client);
    expect(removed).toBe(1);
    const remaining = await db.select().from(schema.taskCompletionEvents);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe("e1");
  });
});
