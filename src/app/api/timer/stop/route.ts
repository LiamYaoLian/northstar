import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { toTimerApiError } from "@/lib/api/timer/to-timer-api-error";
import { stopTimer } from "@/lib/services/timers";

export async function POST() {
  try {
    const user = await requireUser();
    const entry = await stopTimer(user.id);
    return NextResponse.json({ entry });
  } catch (err) {
    return toTimerApiError(err, "Failed to stop timer");
  }
}
