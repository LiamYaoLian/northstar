import { NextResponse } from "next/server";
import { applyBreakdownPreview } from "@/lib/services/tasks";
import type { ProposedSubtask } from "@/lib/tasks/subtask-diff";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const body = await request.json();
    const proposed = body?.proposed;

    if (!Array.isArray(proposed) || proposed.length === 0) {
      return NextResponse.json({ error: "Invalid proposed subtasks" }, { status: 400 });
    }

    const safeProposed: ProposedSubtask[] = proposed
      .filter(
        (item): item is ProposedSubtask =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof item.title === "string" &&
          item.title.trim().length > 0 &&
          (item.existingId === undefined || typeof item.existingId === "string"),
      )
      .map((item) => ({
        title: item.title.trim(),
        ...(item.existingId ? { existingId: item.existingId } : {}),
      }));

    if (safeProposed.length === 0) {
      return NextResponse.json({ error: "Invalid proposed subtasks" }, { status: 400 });
    }

    const result = await applyBreakdownPreview(id, safeProposed, undefined, user.id);
    if (!result.task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/tasks/[id]/breakdown/apply", err);
    return toApiError(err, "Failed to apply breakdown");
  }
}
