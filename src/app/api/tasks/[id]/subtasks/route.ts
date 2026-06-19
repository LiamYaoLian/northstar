import { NextResponse } from "next/server";
import { createSubtask, listSubtasks } from "@/lib/services/tasks";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    return NextResponse.json({ subtasks: await listSubtasks(id, user.id) });
  } catch (err) {
    console.error("GET /api/tasks/[id]/subtasks", err);
    return toApiError(err, "Failed to list subtasks");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const body = await request.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const subtask = await createSubtask(id, { title: body.title }, user.id);
    if (!subtask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ subtask });
  } catch (err) {
    console.error("POST /api/tasks/[id]/subtasks", err);
    return toApiError(err, "Failed to create subtask");
  }
}
