import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { INIT_SQL } from "./init-sql";
import {
  addAuthTablesIfMissing,
  addBusinessUserColumnsIfMissing,
  addTaskStartAtColumnIfMissing,
  backfillLegacyUserIds,
  promoteLegacyOwnerEmail,
} from "./migrations";
import { id, nowIso } from "@/lib/utils";

const { users, tasks, northStars } = schema;

type Db = LibSQLDatabase<typeof schema>;

describe("legacy owner migration", () => {
  let client: Client;
  let db: Db;
  let previousEmail: string | undefined;

  beforeEach(async () => {
    previousEmail = process.env.NORTHSTAR_DEFAULT_USER_EMAIL;
    client = createClient({ url: ":memory:" });
    db = drizzle(client, { schema });
    await client.executeMultiple(INIT_SQL);
    await addAuthTablesIfMissing(client);
    await addTaskStartAtColumnIfMissing(client);
    await addBusinessUserColumnsIfMissing(client);
  });

  afterEach(() => {
    if (previousEmail === undefined) {
      delete process.env.NORTHSTAR_DEFAULT_USER_EMAIL;
    } else {
      process.env.NORTHSTAR_DEFAULT_USER_EMAIL = previousEmail;
    }
    vi.restoreAllMocks();
  });

  it("promotes local@northstar.dev to NORTHSTAR_DEFAULT_USER_EMAIL without moving row ids", async () => {
    process.env.NORTHSTAR_DEFAULT_USER_EMAIL = "liamyaolian@gmail.com";
    const ts = nowIso();
    const legacyUserId = id();
    await db.insert(users).values({
      id: legacyUserId,
      name: "Legacy",
      email: "local@northstar.dev",
      emailVerified: null,
      image: null,
      createdAt: ts,
      updatedAt: ts,
    });
    await db.insert(northStars).values({
      id: id(),
      userId: legacyUserId,
      statement: "Keep my north star",
      horizon: "2026",
      hoursPerWeek: 40,
      workPrimaryTrack: null,
      createdAt: ts,
      updatedAt: ts,
    });
    await db.insert(tasks).values({
      id: id(),
      userId: legacyUserId,
      title: "Legacy task",
      description: null,
      pillarId: null,
      focusTrack: null,
      projectId: null,
      status: "todo",
      intimidationScore: 1,
      estimatedMin: 30,
      startAt: null,
      dueAt: null,
      createdAt: ts,
      updatedAt: ts,
      completedAt: null,
      recurrenceType: "none",
      recurrenceDays: null,
      recurrenceCarryOver: false,
    });

    await promoteLegacyOwnerEmail(db, client);

    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.email, "liamyaolian@gmail.com"));
    expect(owner?.id).toBe(legacyUserId);

    const taskRows = await db.select().from(tasks);
    expect(taskRows).toHaveLength(1);
    expect(taskRows[0]?.userId).toBe(legacyUserId);

    const legacyUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, "local@northstar.dev"));
    expect(legacyUsers).toHaveLength(0);
  });

  it("backfills null user_id rows to the legacy owner", async () => {
    process.env.NORTHSTAR_DEFAULT_USER_EMAIL = "owner@example.com";
    const ts = nowIso();
    const taskId = id();
    await db.insert(tasks).values({
      id: taskId,
      userId: null,
      title: "Unowned task",
      description: null,
      pillarId: null,
      focusTrack: null,
      projectId: null,
      status: "todo",
      intimidationScore: 1,
      estimatedMin: 30,
      startAt: null,
      dueAt: null,
      createdAt: ts,
      updatedAt: ts,
      completedAt: null,
      recurrenceType: "none",
      recurrenceDays: null,
      recurrenceCarryOver: false,
    });

    await backfillLegacyUserIds(client, db);
    await promoteLegacyOwnerEmail(db, client);

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    expect(task?.userId).toBeTruthy();

    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.email, "owner@example.com"));
    expect(owner?.id).toBe(task?.userId);
  });
});
