import { NextResponse } from "next/server";
import {
  InvalidCompletionQueryError,
  parseCompletionsSummaryQuery,
} from "@/lib/api/completions/parse-completions-query";
import { summarizeCompletionsByPillar } from "@/lib/services/completions";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";
import { InvalidTimezoneError } from "@/lib/tasks/timezone";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const user = await requireUser();
    const query = parseCompletionsSummaryQuery(url.searchParams);
    const summary = await summarizeCompletionsByPillar({ ...query, userId: user.id });
    return NextResponse.json({ summary });
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
    if (err instanceof InvalidCompletionQueryError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof InvalidTimezoneError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("GET /api/completions/summary", err);
    return toApiError(err, "Failed to summarize completions");
  }
}
