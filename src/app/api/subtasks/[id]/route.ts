import { NextResponse } from "next/server";
import { updateSubtask, deleteSubtask } from "@/lib/services/tasks";
import { parseTzFromSearchParams } from "@/lib/api/tasks/parse-tz-query";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
      { tz },
    );
    if (!subtask) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ subtask });
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
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
