import { NextResponse } from "next/server";
import { reorderTasks } from "@/lib/services/tasks";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function POST(request: Request) {
  try {
    const { orderedIds } = await request.json();
    const user = await requireUser();
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "orderedIds required" }, { status: 400 });
    }
    const tasks = await reorderTasks(orderedIds, user.id);
    if (!tasks) {
      return NextResponse.json({ error: "Invalid task order" }, { status: 400 });
    }
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("POST /api/tasks/reorder", err);
    return toApiError(err, "Reorder failed");
  }
}
