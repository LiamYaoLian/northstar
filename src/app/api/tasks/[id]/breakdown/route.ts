import { NextResponse } from "next/server";
import { previewBreakdownTask } from "@/lib/services/tasks";
import { BreakdownError } from "@/lib/ai/breakdown";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    let userPrompt: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body.prompt === "string") {
        userPrompt = body.prompt;
      }
    } catch {
      // empty body is fine
    }

    const result = await previewBreakdownTask(id, { userPrompt, userId: user.id });
    if (!result.preview && !result.task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/tasks/[id]/breakdown", err);
    const message =
      err instanceof BreakdownError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Breakdown failed";
    if (!(err instanceof BreakdownError)) {
      return toApiError(err, "Breakdown failed");
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
