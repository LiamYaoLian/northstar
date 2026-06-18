import { NextResponse } from "next/server";
import { updateTask } from "@/lib/services/tasks";
import { patchTaskRecurrenceSchema } from "@/lib/api/tasks/schemas";
import { parseTzFromSearchParams } from "@/lib/api/tasks/parse-tz-query";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const url = new URL(request.url);
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
      { tz },
    );
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ task });
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
    console.error("PATCH /api/tasks/[id]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 400 },
    );
  }
}
