import { NextResponse } from "next/server";
import { parseCompletionsSummaryQuery, InvalidCompletionQueryError } from "@/lib/api/completions/parse-completions-query";
import { listTimeEntriesForExport } from "@/lib/services/time-entries-export";
import { timeEntriesToCsv } from "@/lib/export/time-entries-csv";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";
import { InvalidTimezoneError } from "@/lib/tasks/timezone";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const user = await requireUser();
    const query = parseCompletionsSummaryQuery(url.searchParams);
    const rows = await listTimeEntriesForExport(
      query.since,
      query.until,
      query.tz,
      user.id,
    );
    const csv = timeEntriesToCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="time-entries.csv"',
      },
    });
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
    if (err instanceof InvalidCompletionQueryError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof InvalidTimezoneError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("GET /api/time-entries/export", err);
    return toApiError(err, "Failed to export time entries");
  }
}
