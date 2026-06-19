import { describe, it, expect, beforeAll } from "vitest";
import { ensureDbReady } from "@/lib/db";
import { parseCompletionsQuery } from "@/lib/api/completions/parse-completions-query";
import { listCompletionEvents } from "@/lib/services/completions";
import { taskCompletionEvents } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import { anyUserIdWithStrategy } from "@/lib/test-helpers/auth";

describe("completions API query path", () => {
  let userId: string;

  beforeAll(async () => {
    await ensureDbReady();
    userId = await anyUserIdWithStrategy();
  });

  it("returns all events when pillarId is omitted from query string", async () => {
    const parsed = parseCompletionsQuery(
      new URLSearchParams("since=2000-01-01&until=2099-12-31&tz=America/Toronto"),
    );
    expect(parsed.pillarId).toBeUndefined();

    const rows = await getDb()
      .select()
      .from(taskCompletionEvents)
      .where(eq(taskCompletionEvents.userId, userId));
    const events = await listCompletionEvents({ ...parsed, userId });
    expect(events.length).toBe(rows.length);
  });
});
