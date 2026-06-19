export function formatStopwatchElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function isPomodoroOvertime(elapsedMs: number, targetMin: number): boolean {
  return elapsedMs >= targetMin * 60_000;
}

export function formatPomodoroRemaining(elapsedMs: number, targetMin: number): string {
  const targetMs = targetMin * 60_000;
  if (elapsedMs >= targetMs) {
    const overtimeMs = elapsedMs - targetMs;
    const totalSec = Math.floor(overtimeMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `+${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const remainingMs = targetMs - elapsedMs;
  const totalSec = Math.floor(remainingMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
