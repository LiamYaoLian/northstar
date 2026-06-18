import { NextResponse } from "next/server";
import { reorderTasks } from "@/lib/services/tasks";

export async function POST(request: Request) {
  try {
    const { orderedIds } = await request.json();
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "orderedIds required" }, { status: 400 });
    }
    const tasks = await reorderTasks(orderedIds);
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("POST /api/tasks/reorder", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reorder failed" },
      { status: 500 },
    );
  }
}
