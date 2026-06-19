import { beforeAll, describe, expect, it } from "vitest";
import { ensureDbReady, getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getStrategy, saveStrategy } from "@/lib/services/strategy";
import {
  createProject,
  listProjects,
  ProjectValidationError,
  updateProject,
} from "@/lib/services/projects";
import { id, nowIso } from "@/lib/utils";

async function createTestUser(label: string) {
  const userId = id();
  const ts = nowIso();
  await getDb().insert(users).values({
    id: userId,
    name: `Projects ${label}`,
    email: `projects-${label}-${userId}@example.com`,
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
    source: "projects_test",
  };
}

async function workPillarId(userId: string) {
  const strategy = await getStrategy(userId);
  const workPillar = strategy?.pillars.find((pillar) => pillar.name === "工作");
  if (!workPillar) throw new Error("missing work pillar");
  return workPillar.id;
}

describe("projects service", () => {
  beforeAll(async () => {
    await ensureDbReady();
  });

  it("creates a project on the Work pillar", async () => {
    const userId = await createTestUser("create");
    await saveStrategy(userId, strategyInput("create"));
    const pillarId = await workPillarId(userId);

    const project = await createProject(
      { name: "找工作", pillarId, focusTrack: "进大厂" },
      userId,
    );

    expect(project?.name).toBe("找工作");
    expect(project?.pillarId).toBe(pillarId);
    expect(project?.focusTrack).toBe("进大厂");
    expect(project?.status).toBe("active");
  });

  it("rejects duplicate active project names", async () => {
    const userId = await createTestUser("duplicate");
    await saveStrategy(userId, strategyInput("duplicate"));
    const pillarId = await workPillarId(userId);

    await createProject({ name: "找工作", pillarId }, userId);

    await expect(
      createProject({ name: "找工作", pillarId }, userId),
    ).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it("rejects projects on non-Work pillars", async () => {
    const userId = await createTestUser("non-work");
    await saveStrategy(userId, strategyInput("non-work"));
    const strategy = await getStrategy(userId);
    const healthPillar = strategy?.pillars.find((pillar) => pillar.name === "健康");
    if (!healthPillar) throw new Error("missing health pillar");

    await expect(
      createProject({ name: "Marathon", pillarId: healthPillar.id }, userId),
    ).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it("rejects invalid focus tracks", async () => {
    const userId = await createTestUser("bad-track");
    await saveStrategy(userId, strategyInput("bad-track"));
    const pillarId = await workPillarId(userId);

    await expect(
      createProject({ name: "Side hustle", pillarId, focusTrack: "副业" }, userId),
    ).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it("lists only active projects by default", async () => {
    const userId = await createTestUser("list");
    await saveStrategy(userId, strategyInput("list"));
    const pillarId = await workPillarId(userId);

    const active = await createProject({ name: "找工作", pillarId }, userId);
    const archived = await createProject({ name: "Old initiative", pillarId }, userId);
    await updateProject(archived!.id, { status: "archived" }, userId);

    const listed = await listProjects(userId);
    expect(listed.map((project) => project.id)).toEqual([active!.id]);
  });

  it("can list archived projects when requested", async () => {
    const userId = await createTestUser("archived-list");
    await saveStrategy(userId, strategyInput("archived-list"));
    const pillarId = await workPillarId(userId);

    const project = await createProject({ name: "找工作", pillarId }, userId);
    await updateProject(project!.id, { status: "archived" }, userId);

    const listed = await listProjects(userId, { includeArchived: true });
    expect(listed.some((row) => row.id === project!.id)).toBe(true);
  });

  it("allows reusing a name after archive", async () => {
    const userId = await createTestUser("reuse-name");
    await saveStrategy(userId, strategyInput("reuse-name"));
    const pillarId = await workPillarId(userId);

    const first = await createProject({ name: "找工作", pillarId }, userId);
    await updateProject(first!.id, { status: "archived" }, userId);

    const second = await createProject({ name: "找工作", pillarId }, userId);
    expect(second?.status).toBe("active");
  });
});
