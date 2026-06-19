import type { ActiveTimerSession } from "@/lib/services/timer-types";
import {
  formatPomodoroRemaining,
  formatStopwatchElapsed,
  isPomodoroOvertime,
} from "@/lib/timer/display";

export function computeElapsedMs(
  session: ActiveTimerSession,
  serverSkewMs: number,
  now = Date.now(),
): number {
  return Math.max(0, now + serverSkewMs - new Date(session.startedAt).getTime());
}

export function formatTimerDisplay(
  session: ActiveTimerSession,
  elapsedMs: number,
): { label: string; overtime: boolean } {
  if (session.mode === "pomodoro" && session.targetDurationMin != null) {
    return {
      label: formatPomodoroRemaining(elapsedMs, session.targetDurationMin),
      overtime: isPomodoroOvertime(elapsedMs, session.targetDurationMin),
    };
  }

  return {
    label: formatStopwatchElapsed(elapsedMs),
    overtime: false,
  };
}

export const POMODORO_PRESETS = [15, 25, 50] as const;
