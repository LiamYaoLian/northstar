import { NextResponse } from "next/server";
import { recalculatePriorities } from "@/lib/services/tasks";

export async function POST() {
  try {
    const result = await recalculatePriorities();
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/tasks/recalculate-priorities", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Recalculate failed" },
      { status: 500 },
    );
  }
}
