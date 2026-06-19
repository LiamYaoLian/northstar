import { NextResponse } from "next/server";
import {
  InvalidCompletionQueryError,
} from "@/lib/api/completions/parse-completions-query";
import { tzErrorResponse } from "@/lib/api/tasks/tz-error";
import { toApiError } from "@/lib/auth/errors";
import { InvalidTimezoneError } from "@/lib/tasks/timezone";

export function handleCompletionsApiError(
  err: unknown,
  routeLabel: string,
  fallbackMessage: string,
): NextResponse {
  const tzErr = tzErrorResponse(err);
  if (tzErr) return tzErr;
  if (err instanceof InvalidCompletionQueryError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof InvalidTimezoneError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error(routeLabel, err);
  return toApiError(err, fallbackMessage);
}
