import { NextResponse } from "next/server";
import {
  getAlignmentDashboard,
  parseAlignmentPeriod,
} from "@/lib/services/alignment";
import { parseTzFromSearchParams } from "@/lib/api/tasks/parse-tz-query";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tz = parseTzFromSearchParams(url.searchParams);
    const period = parseAlignmentPeriod(url.searchParams.get("period"));
    return NextResponse.json(await getAlignmentDashboard(tz, period));
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
    throw err;
  }
}
