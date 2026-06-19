import "server-only";

import { ensureDbReady, getDb } from "@/lib/db";
import { projects, strategicPillars } from "@/lib/db/schema";
import { findWorkPillar } from "@/lib/pillars";
import { isValidWorkFocusTrack } from "@/lib/tasks/project-domain";
import { and, eq } from "drizzle-orm";
import { id, nowIso } from "@/lib/utils";

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

function scopedProjectId(projectId: string, userId?: string) {
  return userId
    ? and(eq(projects.id, projectId), eq(projects.userId, userId))
    : eq(projects.id, projectId);
}

function scopedPillarId(pillarId: string, userId?: string) {
  return userId
    ? and(eq(strategicPillars.id, pillarId), eq(strategicPillars.userId, userId))
    : eq(strategicPillars.id, pillarId);
}

async function fetchWorkPillar(userId?: string) {
  const db = getDb();
  const pillarRows = db.select().from(strategicPillars);
  const pillarList = userId
    ? await pillarRows.where(eq(strategicPillars.userId, userId))
    : await pillarRows;
  return findWorkPillar(pillarList);
}

async function assertWorkPillarId(pillarId: string, userId?: string) {
  const workPillar = await fetchWorkPillar(userId);
  if (!workPillar || workPillar.id !== pillarId) {
    throw new ProjectValidationError("Projects are only allowed on the Work pillar");
  }
  return workPillar;
}

async function assertUniqueActiveName(
  name: string,
  pillarId: string,
  userId: string,
  excludeProjectId?: string,
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.pillarId, pillarId),
        eq(projects.status, "active"),
        eq(projects.name, name.trim()),
      ),
    );
  const duplicate = rows.find((row) => row.id !== excludeProjectId);
  if (duplicate) {
    throw new ProjectValidationError("An active project with this name already exists");
  }
}

export async function listProjects(
  userId: string,
  options?: { includeArchived?: boolean },
) {
  await ensureDbReady();
  const db = getDb();
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId));

  const filtered = options?.includeArchived
    ? rows
    : rows.filter((row) => row.status === "active");

  return filtered.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function getProjectById(
  projectId: string,
  userId?: string,
  db = getDb(),
) {
  await ensureDbReady();
  const [row] = await db
    .select()
    .from(projects)
    .where(scopedProjectId(projectId, userId));
  return row ?? null;
}

export async function createProject(
  input: {
    name: string;
    pillarId: string;
    focusTrack?: string | null;
  },
  userId: string,
) {
  const name = input.name.trim();
  if (!name) {
    throw new ProjectValidationError("Project name is required");
  }

  const workPillar = await assertWorkPillarId(input.pillarId, userId);
  if (
    input.focusTrack &&
    !isValidWorkFocusTrack(input.focusTrack, workPillar.focusTracks)
  ) {
    throw new ProjectValidationError("Invalid focus track for Work pillar");
  }

  await assertUniqueActiveName(name, input.pillarId, userId);

  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  const existing = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId));
  const maxOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder ?? 0), 0);
  const projectId = id();

  await db.insert(projects).values({
    id: projectId,
    userId,
    pillarId: input.pillarId,
    name,
    focusTrack: input.focusTrack ?? null,
    sortOrder: maxOrder + 1,
    status: "active",
    createdAt: ts,
    updatedAt: ts,
  });

  return getProjectById(projectId, userId);
}

export async function updateProject(
  projectId: string,
  patch: Partial<{
    name: string;
    status: "active" | "archived";
    focusTrack: string | null;
    sortOrder: number;
  }>,
  userId: string,
) {
  const existing = await getProjectById(projectId, userId);
  if (!existing) return null;

  const workPillar = await fetchWorkPillar(userId);
  if (!workPillar || existing.pillarId !== workPillar.id) {
    throw new ProjectValidationError("Projects are only allowed on the Work pillar");
  }

  const nextName = patch.name !== undefined ? patch.name.trim() : existing.name;
  if (!nextName) {
    throw new ProjectValidationError("Project name is required");
  }

  const nextStatus = patch.status ?? existing.status;
  if (
    nextStatus === "active" &&
    (patch.name !== undefined || patch.status === "active")
  ) {
    await assertUniqueActiveName(nextName, existing.pillarId, userId, projectId);
  }

  const nextFocusTrack =
    patch.focusTrack !== undefined ? patch.focusTrack : existing.focusTrack;
  if (
    nextFocusTrack &&
    !isValidWorkFocusTrack(nextFocusTrack, workPillar.focusTracks)
  ) {
    throw new ProjectValidationError("Invalid focus track for Work pillar");
  }

  await ensureDbReady();
  const db = getDb();
  const ts = nowIso();
  await db
    .update(projects)
    .set({
      ...(patch.name !== undefined ? { name: nextName } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.focusTrack !== undefined ? { focusTrack: patch.focusTrack } : {}),
      ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
      updatedAt: ts,
    })
    .where(scopedProjectId(projectId, userId));

  return getProjectById(projectId, userId);
}

export async function assertAssignableProject(
  projectId: string,
  pillarId: string | null,
  userId?: string,
  db = getDb(),
) {
  const project = await getProjectById(projectId, userId, db);
  if (!project) {
    throw new ProjectValidationError("Project not found");
  }
  if (project.status !== "active") {
    throw new ProjectValidationError("Archived projects cannot be assigned");
  }
  if (pillarId !== project.pillarId) {
    throw new ProjectValidationError("Task pillar must match project pillar");
  }
  return project;
}

export async function fetchPillarById(pillarId: string, userId?: string) {
  await ensureDbReady();
  const db = getDb();
  const [pillar] = await db
    .select()
    .from(strategicPillars)
    .where(scopedPillarId(pillarId, userId));
  return pillar ?? null;
}
