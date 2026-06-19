import { NextResponse } from "next/server";
import { parseCompletionsSummaryQuery } from "@/lib/api/completions/parse-completions-query";
import { handleCompletionsApiError } from "@/lib/api/completions/handle-completions-error";
import { listTimeEntriesForExport } from "@/lib/services/time-entries-export";
import { timeEntriesToCsv } from "@/lib/export/time-entries-csv";
import { requireUser } from "@/lib/auth/require-user";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const user = await requireUser();
    const query = parseCompletionsSummaryQuery(url.searchParams);
    const rows = await listTimeEntriesForExport(
      user.id,
      query.since,
      query.until,
      query.tz,
    );
    const csv = timeEntriesToCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="time-entries.csv"',
      },
    });
  } catch (err) {
    return handleCompletionsApiError(
      err,
      "GET /api/time-entries/export",
      "Failed to export time entries",
    );
  }
}
