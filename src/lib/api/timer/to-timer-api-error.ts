import { NextResponse } from "next/server";
import { UnauthorizedError, toApiError } from "@/lib/auth/errors";
import {
  TimerAlreadyRunningError,
  isTimerServiceError,
} from "@/lib/services/timer-errors";

export function toTimerApiError(err: unknown, fallback = "Timer request failed") {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }

  if (err instanceof TimerAlreadyRunningError) {
    return NextResponse.json(
      {
        error: err.message,
        session: err.active,
      },
      { status: err.status },
    );
  }

  if (isTimerServiceError(err)) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  return toApiError(err, fallback);
}
