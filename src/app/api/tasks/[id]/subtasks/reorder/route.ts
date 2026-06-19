import { NextResponse } from "next/server";
import { reorderSubtasks } from "@/lib/services/tasks";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: taskId } = await params;
    const user = await requireUser();
    const { orderedIds } = await request.json();
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "orderedIds required" }, { status: 400 });
    }
    const subtasks = await reorderSubtasks(taskId, orderedIds, user.id);
    if (!subtasks) {
      return NextResponse.json({ error: "Invalid subtask order" }, { status: 400 });
    }
    return NextResponse.json({ subtasks });
  } catch (err) {
    console.error("POST /api/tasks/[id]/subtasks/reorder", err);
    return toApiError(err, "Reorder failed");
  }
}
