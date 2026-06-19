import { NextResponse } from "next/server";
import {
  getAlignmentDashboard,
  parseAlignmentPeriod,
} from "@/lib/services/alignment";
import { parseTzFromSearchParams } from "@/lib/api/tasks/parse-tz-query";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const user = await requireUser();
    const tz = parseTzFromSearchParams(url.searchParams);
    const period = parseAlignmentPeriod(url.searchParams.get("period"));
    return NextResponse.json(await getAlignmentDashboard(user.id, tz, period, new Date()));
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
    return toApiError(err, "Failed to load alignment");
  }
}
