import { NextResponse } from "next/server";
import {
  createTask,
  listTasksWithSubtasks,
  listSubtasks,
} from "@/lib/services/tasks";
import { parseTzFromSearchParams } from "@/lib/api/tasks/parse-tz-query";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";
import {
  createTaskRecurrenceSchema,
} from "@/lib/api/tasks/schemas";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tz = parseTzFromSearchParams(searchParams);
    const status = searchParams.get("status") ?? undefined;
    const sort = searchParams.get("sort") === "manual" ? "manual" : "priority";
    return NextResponse.json({
      tasks: await listTasksWithSubtasks(status, sort, tz),
    });
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
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
    const recurrence = createTaskRecurrenceSchema.parse({
      recurrenceType: body.recurrenceType,
      recurrenceDays: body.recurrenceDays,
      recurrenceCarryOver: body.recurrenceCarryOver,
    });
    const task = await createTask({ ...body, ...recurrence });
    const subtasks = task ? await listSubtasks(task.id) : [];
    return NextResponse.json({ task, subtasks });
  } catch (err) {
    console.error("POST /api/tasks", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create task" },
      { status: 400 },
    );
  }
}
