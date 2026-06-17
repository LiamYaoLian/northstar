import { NextResponse } from "next/server";
import { breakdownTask } from "@/lib/services/tasks";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let userPrompt: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body.prompt === "string") {
        userPrompt = body.prompt;
      }
    } catch {
      // empty body is fine
    }
    const result = await breakdownTask(id, { userPrompt });
    if (!result) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/tasks/[id]/breakdown", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Breakdown failed" },
      { status: 500 },
    );
  }
}
