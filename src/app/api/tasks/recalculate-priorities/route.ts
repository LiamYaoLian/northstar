import { NextResponse } from "next/server";
import { recalculatePriorities } from "@/lib/services/tasks";
import { parseTzFromSearchParams } from "@/lib/api/tasks/parse-tz-query";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await requireUser();
    const tz = parseTzFromSearchParams(searchParams);
    const result = await recalculatePriorities(tz, user.id);
    return NextResponse.json(result);
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
    console.error("POST /api/tasks/recalculate-priorities", err);
    return toApiError(err, "Recalculate failed");
  }
}
