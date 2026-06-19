import { NextResponse } from "next/server";
import { parseCompletionsSummaryQuery } from "@/lib/api/completions/parse-completions-query";
import { handleCompletionsApiError } from "@/lib/api/completions/handle-completions-error";
import { summarizeCompletionsByPillar } from "@/lib/services/completions";
import { requireUser } from "@/lib/auth/require-user";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const user = await requireUser();
    const query = parseCompletionsSummaryQuery(url.searchParams);
    const summary = await summarizeCompletionsByPillar({ ...query, userId: user.id });
    return NextResponse.json({ summary });
  } catch (err) {
    return handleCompletionsApiError(
      err,
      "GET /api/completions/summary",
      "Failed to summarize completions",
    );
  }
}
