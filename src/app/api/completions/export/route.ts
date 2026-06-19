import { NextResponse } from "next/server";
import { parseCompletionsQuery } from "@/lib/api/completions/parse-completions-query";
import { handleCompletionsApiError } from "@/lib/api/completions/handle-completions-error";
import { listCompletionEvents } from "@/lib/services/completions";
import { completionsToCsv } from "@/lib/export/completions-csv";
import { requireUser } from "@/lib/auth/require-user";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const user = await requireUser();
    const query = parseCompletionsQuery(url.searchParams);
    const events = await listCompletionEvents({ ...query, userId: user.id });
    const csv = completionsToCsv(events);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="completions.csv"',
      },
    });
  } catch (err) {
    return handleCompletionsApiError(
      err,
      "GET /api/completions/export",
      "Failed to export completions",
    );
  }
}
