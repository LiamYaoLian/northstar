import { NextResponse } from "next/server";
import { updateSubtask, deleteSubtask } from "@/lib/services/tasks";
import { parseTzFromSearchParams } from "@/lib/api/tasks/parse-tz-query";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const url = new URL(request.url);
    const tz = parseTzFromSearchParams(url.searchParams);
    const body = await request.json();
    const { isDone, title } = body as { isDone?: boolean; title?: string };

    if (isDone === undefined && title === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const subtask = await updateSubtask(
      id,
      {
        ...(isDone !== undefined ? { isDone: Boolean(isDone) } : {}),
        ...(title !== undefined ? { title: String(title) } : {}),
      },
      { tz, userId: user.id },
    );
    if (!subtask) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ subtask });
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
    console.error("PATCH /api/subtasks/[id]", err);
    return toApiError(err, "Failed to update subtask");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const ok = await deleteSubtask(id, user.id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/subtasks/[id]", err);
    return toApiError(err, "Failed to delete subtask");
  }
}
