import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";
import { updateProject, ProjectValidationError } from "@/lib/services/projects";

function projectApiError(err: unknown, fallback: string) {
  if (err instanceof ProjectValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return toApiError(err, fallback);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const user = await requireUser();
    const body = await request.json();
    const patch: {
      name?: string;
      status?: "active" | "archived";
      focusTrack?: string | null;
      sortOrder?: number;
    } = {};

    if (typeof body.name === "string") patch.name = body.name;
    if (body.status === "active" || body.status === "archived") {
      patch.status = body.status;
    }
    if (body.focusTrack === null || typeof body.focusTrack === "string") {
      patch.focusTrack = body.focusTrack;
    }
    if (Number.isInteger(body.sortOrder)) patch.sortOrder = body.sortOrder;

    const project = await updateProject(id, patch, user.id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (err) {
    return projectApiError(err, "Failed to update project");
  }
}
