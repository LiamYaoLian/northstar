import { NextResponse } from "next/server";
import { parseCompletionsQuery } from "@/lib/api/completions/parse-completions-query";
import { handleCompletionsApiError } from "@/lib/api/completions/handle-completions-error";
import { listCompletionEvents } from "@/lib/services/completions";
import { requireUser } from "@/lib/auth/require-user";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const user = await requireUser();
    const query = parseCompletionsQuery(url.searchParams);
    const events = await listCompletionEvents({ ...query, userId: user.id });
    return NextResponse.json({ events });
  } catch (err) {
    return handleCompletionsApiError(
      err,
      "GET /api/completions",
      "Failed to list completions",
    );
  }
}
