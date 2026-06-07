import { NextResponse } from "next/server";
import { breakdownTask } from "@/lib/services/tasks";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await breakdownTask(id);
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
