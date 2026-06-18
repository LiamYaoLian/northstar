import { NextResponse } from "next/server";
import { toggleSubtask, deleteSubtask } from "@/lib/services/tasks";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { isDone } = await request.json();
    const subtask = await toggleSubtask(id, Boolean(isDone));
    if (!subtask) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ subtask });
  } catch (err) {
    console.error("PATCH /api/subtasks/[id]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update subtask" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ok = await deleteSubtask(id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/subtasks/[id]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete subtask" },
      { status: 500 },
    );
  }
}
