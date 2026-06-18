import { NextResponse } from "next/server";
import {
  createTask,
  listTasksWithSubtasks,
  listSubtasks,
} from "@/lib/services/tasks";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const sort = searchParams.get("sort") === "manual" ? "manual" : "priority";
    return NextResponse.json({
      tasks: await listTasksWithSubtasks(status, sort),
    });
  } catch (err) {
    console.error("GET /api/tasks", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list tasks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const task = await createTask(body);
    const subtasks = task ? await listSubtasks(task.id) : [];
    return NextResponse.json({ task, subtasks });
  } catch (err) {
    console.error("POST /api/tasks", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create task" },
      { status: 500 },
    );
  }
}
