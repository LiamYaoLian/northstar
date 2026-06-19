import { NextResponse } from "next/server";
import { updateTask } from "@/lib/services/tasks";
import { ProjectValidationError } from "@/lib/services/projects";
import { patchTaskRecurrenceSchema } from "@/lib/api/tasks/schemas";
import { parseTzFromSearchParams } from "@/lib/api/tasks/parse-tz-query";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const url = new URL(request.url);
    const user = await requireUser();
    const tz = parseTzFromSearchParams(url.searchParams);
    const body = await request.json();
    const patch: Record<string, unknown> = { ...body };

    if (
      "recurrenceType" in body ||
      "recurrenceDays" in body ||
      "recurrenceCarryOver" in body
    ) {
      Object.assign(
        patch,
        patchTaskRecurrenceSchema.parse({
          recurrenceType: body.recurrenceType,
          recurrenceDays: body.recurrenceDays,
          recurrenceCarryOver: body.recurrenceCarryOver,
        }),
      );
    }

    const task = await updateTask(
      id,
      patch as Parameters<typeof updateTask>[1],
      { tz, userId: user.id },
    );
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ task });
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
    if (err instanceof ProjectValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("PATCH /api/tasks/[id]", err);
    return toApiError(err, "Update failed");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const ok = await deleteTask(id, user.id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/tasks/[id]", err);
    return toApiError(err, "Failed to delete task");
  }
}
