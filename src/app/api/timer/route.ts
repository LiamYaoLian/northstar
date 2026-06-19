import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { toTimerApiError } from "@/lib/api/timer/to-timer-api-error";
import { getActiveTimer } from "@/lib/services/timers";

export async function GET() {
  try {
    const user = await requireUser();
    const active = await getActiveTimer(user.id);
    return NextResponse.json({ session: active });
  } catch (err) {
    return toTimerApiError(err, "Failed to load timer");
  }
}
