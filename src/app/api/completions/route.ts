import { NextResponse } from "next/server";
import {
  InvalidCompletionQueryError,
  parseCompletionsQuery,
} from "@/lib/api/completions/parse-completions-query";
import { listCompletionEvents } from "@/lib/services/completions";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";
import { InvalidTimezoneError } from "@/lib/tasks/timezone";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const user = await requireUser();
    const query = parseCompletionsQuery(url.searchParams);
    const events = await listCompletionEvents({ ...query, userId: user.id });
    return NextResponse.json({ events });
  } catch (err) {
    const tzErr = tzErrorResponse(err);
    if (tzErr) return tzErr;
    if (err instanceof InvalidCompletionQueryError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof InvalidTimezoneError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("GET /api/completions", err);
    return toApiError(err, "Failed to list completions");
  }
}
