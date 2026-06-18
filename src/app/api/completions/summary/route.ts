import { NextResponse } from "next/server";
import {
  InvalidCompletionQueryError,
  parseCompletionsSummaryQuery,
} from "@/lib/api/completions/parse-completions-query";
import { summarizeCompletionsByPillar } from "@/lib/services/completions";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";
import { InvalidTimezoneError } from "@/lib/tasks/timezone";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = parseCompletionsSummaryQuery(url.searchParams);
    const summary = await summarizeCompletionsByPillar(query);
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
    return NextResponse.json({ error: "Failed to summarize completions" }, { status: 500 });
  }
}
