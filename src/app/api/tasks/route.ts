import { NextResponse } from "next/server";
import {
  createTask,
  listTasksWithSubtasks,
  listSubtasks,
} from "@/lib/services/tasks";
import { requireUser } from "@/lib/auth/require-user";
import { parseTzFromSearchParams } from "@/lib/api/tasks/parse-tz-query";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";
import { parseCreateTaskRecurrenceFromBody } from "@/lib/api/tasks/schemas";
import { toApiError } from "@/lib/auth/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await requireUser();
    const tz = parseTzFromSearchParams(searchParams);
    const status = searchParams.get("status") ?? undefined;
    const sort = searchParams.get("sort") === "manual" ? "manual" : "priority";
    return NextResponse.json({
      tasks: await listTasksWithSubtasks(status, sort, tz, user.id),
    });
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
    console.error("GET /api/tasks", err);
    return toApiError(err, "Failed to list tasks");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await requireUser();
    const recurrence = parseCreateTaskRecurrenceFromBody(body);
    const task = await createTask(
      recurrence ? { ...body, ...recurrence } : body,
      user.id,
    );
    const subtasks = task ? await listSubtasks(task.id, user.id) : [];
    return NextResponse.json({ task, subtasks });
  } catch (err) {
    console.error("POST /api/tasks", err);
    return toApiError(err, "Failed to create task");
  }
}
