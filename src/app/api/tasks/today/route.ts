import { NextResponse } from "next/server";
import { listDueTodayTasksWithSubtasks } from "@/lib/services/tasks";
import { parseTzFromSearchParams } from "@/lib/api/tasks/parse-tz-query";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tz = parseTzFromSearchParams(searchParams);
    return NextResponse.json({
      tasks: await listDueTodayTasksWithSubtasks(tz),
    });
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
    console.error("GET /api/tasks/today", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list today tasks" },
      { status: 500 },
    );
  }
}
