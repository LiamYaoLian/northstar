import { beforeAll, describe, expect, it } from "vitest";
import { ensureDbReady, getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getStrategy, saveStrategy } from "@/lib/services/strategy";
import {
  assertAssignableProject,
  createProject,
  ProjectValidationError,
  updateProject,
} from "@/lib/services/projects";
import { createTask, updateTask } from "@/lib/services/tasks";
import { id, nowIso } from "@/lib/utils";

const TEST_TZ = "America/New_York";

async function createTestUser(label: string) {
  const userId = id();
  const ts = nowIso();
  await getDb().insert(users).values({
    id: userId,
    name: `Projects tasks ${label}`,
    email: `projects-tasks-${label}-${userId}@example.com`,
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
        focusTracks: [
          { name: "进大厂", shareOfParent: 60 },
          { name: "投资", shareOfParent: 40 },
        ],
      },
      {
        name: "健康",
        targetPct: 40,
        color: "#22c55e",
        keywords: ["health"],
      },
    ],
    source: "projects_tasks_test",
  };
}

async function workPillarId(userId: string) {
  const strategy = await getStrategy(userId);
  const workPillar = strategy?.pillars.find((pillar) => pillar.name === "工作");
  if (!workPillar) throw new Error("missing work pillar");
  return workPillar.id;
}

async function healthPillarId(userId: string) {
  const strategy = await getStrategy(userId);
  const healthPillar = strategy?.pillars.find((pillar) => pillar.name === "健康");
  if (!healthPillar) throw new Error("missing health pillar");
  return healthPillar.id;
}

describe("tasks + projects integration", () => {
  beforeAll(async () => {
    await ensureDbReady();
  });

  it("stores projectId when creating a task with a project", async () => {
    const userId = await createTestUser("with-project");
    await saveStrategy(userId, strategyInput("with-project"));
    const pillarId = await workPillarId(userId);
    const project = await createProject(
      { name: "找工作", pillarId, focusTrack: "投资" },
      userId,
    );

    const task = await createTask(
      {
        title: "整理行为面笔记",
        pillarId,
        projectId: project!.id,
        autoBreakdown: false,
      },
      userId,
      { tz: TEST_TZ },
    );

    expect(task?.projectId).toBe(project!.id);
    expect(task?.pillarId).toBe(pillarId);
  });

  it("prefers classify focusTrack over project default", async () => {
    const userId = await createTestUser("classify-track");
    await saveStrategy(userId, strategyInput("classify-track"));
    const pillarId = await workPillarId(userId);
    const project = await createProject(
      { name: "找工作", pillarId, focusTrack: "投资" },
      userId,
    );

    const task = await createTask(
      {
        title: "Leetcode daily practice",
        pillarId,
        projectId: project!.id,
        autoBreakdown: false,
      },
      userId,
      { tz: TEST_TZ },
    );

    expect(task?.focusTrack).toBe("进大厂");
  });

  it("keeps explicit focusTrack over project default on create", async () => {
    const userId = await createTestUser("explicit-track");
    await saveStrategy(userId, strategyInput("explicit-track"));
    const pillarId = await workPillarId(userId);
    const project = await createProject(
      { name: "找工作", pillarId, focusTrack: "投资" },
      userId,
    );

    const task = await createTask(
      {
        title: "Leetcode daily",
        pillarId,
        projectId: project!.id,
        focusTrack: "进大厂",
        autoBreakdown: false,
      },
      userId,
      { tz: TEST_TZ },
    );

    expect(task?.focusTrack).toBe("进大厂");
  });

  it("clears projectId when pillar moves off Work", async () => {
    const userId = await createTestUser("clear-project");
    await saveStrategy(userId, strategyInput("clear-project"));
    const workId = await workPillarId(userId);
    const healthId = await healthPillarId(userId);
    const project = await createProject({ name: "找工作", pillarId: workId }, userId);

    const created = await createTask(
      {
        title: "Interview prep",
        pillarId: workId,
        projectId: project!.id,
        autoBreakdown: false,
      },
      userId,
      { tz: TEST_TZ },
    );

    const updated = await updateTask(
      created!.id,
      { pillarId: healthId },
      { userId, tz: TEST_TZ },
    );

    expect(updated?.pillarId).toBe(healthId);
    expect(updated?.projectId).toBeNull();
    expect(updated?.focusTrack).toBeNull();
  });

  it("rejects assigning an archived project", async () => {
    const userId = await createTestUser("archived-assign");
    await saveStrategy(userId, strategyInput("archived-assign"));
    const pillarId = await workPillarId(userId);
    const project = await createProject({ name: "找工作", pillarId }, userId);
    await updateProject(project!.id, { status: "archived" }, userId);

    await expect(
      assertAssignableProject(project!.id, pillarId, userId),
    ).rejects.toBeInstanceOf(ProjectValidationError);

    await expect(
      createTask(
        {
          title: "Should fail",
          pillarId,
          projectId: project!.id,
          autoBreakdown: false,
        },
        userId,
        { tz: TEST_TZ },
      ),
    ).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it("rejects project assignment when task pillar mismatches", async () => {
    const userId = await createTestUser("pillar-mismatch");
    await saveStrategy(userId, strategyInput("pillar-mismatch"));
    const workId = await workPillarId(userId);
    const healthId = await healthPillarId(userId);
    const project = await createProject({ name: "找工作", pillarId: workId }, userId);

    await expect(
      createTask(
        {
          title: "Mismatch",
          pillarId: healthId,
          projectId: project!.id,
          autoBreakdown: false,
        },
        userId,
        { tz: TEST_TZ },
      ),
    ).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it("assigns project via updateTask", async () => {
    const userId = await createTestUser("patch-project");
    await saveStrategy(userId, strategyInput("patch-project"));
    const pillarId = await workPillarId(userId);
    const project = await createProject({ name: "找工作", pillarId }, userId);

    const created = await createTask(
      {
        title: "Unassigned task",
        pillarId,
        autoBreakdown: false,
      },
      userId,
      { tz: TEST_TZ },
    );

    const updated = await updateTask(
      created!.id,
      { projectId: project!.id },
      { userId, tz: TEST_TZ },
    );

    expect(updated?.projectId).toBe(project!.id);
  });
});
