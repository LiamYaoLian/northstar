import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { toTimerApiError } from "@/lib/api/timer/to-timer-api-error";
import { cancelTimer } from "@/lib/services/timers";

export async function POST() {
  try {
    const user = await requireUser();
    await cancelTimer(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toTimerApiError(err, "Failed to cancel timer");
  }
}
