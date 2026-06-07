import { NextResponse } from "next/server";
import { createSubtask, listSubtasks } from "@/lib/services/tasks";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return NextResponse.json({ subtasks: listSubtasks(id) });
  } catch (err) {
    console.error("GET /api/tasks/[id]/subtasks", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list subtasks" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const subtask = createSubtask(id, {
      title: body.title,
      isEntryPoint: body.isEntryPoint,
    });
    if (!subtask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ subtask });
  } catch (err) {
    console.error("POST /api/tasks/[id]/subtasks", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create subtask" },
      { status: 500 },
    );
  }
}
