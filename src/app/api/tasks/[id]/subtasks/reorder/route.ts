import { NextResponse } from "next/server";
import { reorderSubtasks } from "@/lib/services/tasks";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: taskId } = await params;
    const { orderedIds } = await request.json();
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "orderedIds required" }, { status: 400 });
    }
    const subtasks = reorderSubtasks(taskId, orderedIds);
    if (!subtasks) {
      return NextResponse.json({ error: "Invalid subtask order" }, { status: 400 });
    }
    return NextResponse.json({ subtasks });
  } catch (err) {
    console.error("POST /api/tasks/[id]/subtasks/reorder", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reorder failed" },
      { status: 500 },
    );
  }
}
