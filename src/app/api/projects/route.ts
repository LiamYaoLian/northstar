import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError, UnauthorizedError } from "@/lib/auth/errors";
import { createProject, listProjects, ProjectValidationError } from "@/lib/services/projects";

function projectApiError(err: unknown, fallback: string) {
  if (err instanceof ProjectValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return toApiError(err, fallback);
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "1";
    const projects = await listProjects(user.id, { includeArchived });
    return NextResponse.json({ projects });
  } catch (err) {
    return projectApiError(err, "Failed to list projects");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name : "";
    const pillarId = typeof body.pillarId === "string" ? body.pillarId : "";
    const focusTrack =
      body.focusTrack === null || typeof body.focusTrack === "string"
        ? body.focusTrack
        : undefined;

    if (!pillarId) {
      return NextResponse.json({ error: "pillarId is required" }, { status: 400 });
    }

    const project = await createProject({ name, pillarId, focusTrack }, user.id);
    return NextResponse.json({ project });
  } catch (err) {
    return projectApiError(err, "Failed to create project");
  }
}
