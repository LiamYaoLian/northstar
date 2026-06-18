import { describe, it, expect, beforeAll } from "vitest";
import { ensureDbReady } from "@/lib/db";
import { parseCompletionsQuery } from "@/lib/api/completions/parse-completions-query";
import { listCompletionEvents } from "@/lib/services/completions";
import { taskCompletionEvents } from "@/lib/db/schema";
import { getDb } from "@/lib/db";

describe("completions API query path", () => {
  beforeAll(async () => {
    await ensureDbReady();
  });

  it("returns all events when pillarId is omitted from query string", async () => {
    const parsed = parseCompletionsQuery(
      new URLSearchParams("since=2000-01-01&until=2099-12-31&tz=America/Toronto"),
    );
    expect(parsed.pillarId).toBeUndefined();

    const rows = await getDb().select().from(taskCompletionEvents);
    const events = await listCompletionEvents(parsed);
    expect(events.length).toBe(rows.length);
  });
});
