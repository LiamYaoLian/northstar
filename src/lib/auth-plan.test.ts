import { describe, expect, it } from "vitest";
import { createClient } from "@libsql/client";
import { UnauthorizedError, toApiError } from "@/lib/auth/errors";
import { INIT_SQL } from "@/lib/db/init-sql";
import { addAuthTablesIfMissing } from "@/lib/db/migrations";

describe("auth-plan contract", () => {
  it("creates users, accounts, sessions, and verification token tables", async () => {
    const client = createClient({ url: ":memory:" });
    await client.executeMultiple(INIT_SQL);
    await addAuthTablesIfMissing(client);
    const result = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type = 'table'
        AND name IN ('users', 'accounts', 'sessions', 'verification_tokens')
      ORDER BY name
    `);
    expect(result.rows.map((row) => String(row.name))).toEqual([
      "accounts",
      "sessions",
      "users",
      "verification_tokens",
    ]);
  });

  it("maps missing sessions to 401 via UnauthorizedError", async () => {
    const res = toApiError(new UnauthorizedError());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Authentication required" });
  });
});
