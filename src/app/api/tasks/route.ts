import { NextResponse } from "next/server";
import { createTask, listTasksWithSubtasks, listSubtasks } from "@/lib/services/tasks";
import { ProjectValidationError } from "@/lib/services/projects";
import { requireUser } from "@/lib/auth/require-user";
import { parseTzFromSearchParams } from "@/lib/api/tasks/parse-tz-query";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";
import { parseCreateTaskRecurrenceFromBody } from "@/lib/api/tasks/schemas";
import { toApiError, UnauthorizedError } from "@/lib/auth/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await requireUser();
    const tz = parseTzFromSearchParams(searchParams);
    const status = searchParams.get("status") ?? undefined;
    return NextResponse.json({
      tasks: await listTasksWithSubtasks(user.id, status, tz),
    });
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
    if (!(err instanceof UnauthorizedError)) {
      console.error("GET /api/tasks", err);
    }
    return toApiError(err, "Failed to list tasks");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await requireUser();
    const tz = parseTzFromSearchParams(new URL(request.url).searchParams);
    const recurrence = parseCreateTaskRecurrenceFromBody(body);
    const task = await createTask(
      recurrence ? { ...body, ...recurrence } : body,
      user.id,
      { tz },
    );
    const subtasks = task ? await listSubtasks(task.id, user.id) : [];
    return NextResponse.json({ task, subtasks });
  } catch (err) {
    if (err instanceof ProjectValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/tasks", err);
    return toApiError(err, "Failed to create task");
  }
}
