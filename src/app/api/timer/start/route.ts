import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { toTimerApiError } from "@/lib/api/timer/to-timer-api-error";
import { startTimer, type TimerMode } from "@/lib/services/timers";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const mode = body.mode as TimerMode;
    const session = await startTimer(
      {
        taskId: String(body.taskId ?? ""),
        mode,
        targetDurationMin: body.targetDurationMin ?? null,
        note: body.note ?? null,
      },
      user.id,
    );
    return NextResponse.json({ session });
  } catch (err) {
    return toTimerApiError(err, "Failed to start timer");
  }
}
