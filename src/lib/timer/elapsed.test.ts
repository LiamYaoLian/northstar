import { describe, expect, it } from "vitest";
import { computeElapsedMs, formatTimerDisplay } from "@/lib/timer/elapsed";
import type { ActiveTimerSession } from "@/lib/services/timer-types";

const stopwatch: ActiveTimerSession = {
  id: "timer-1",
  taskId: "t1",
  mode: "stopwatch",
  startedAt: "2026-01-01T12:00:00.000Z",
  targetDurationMin: null,
};

describe("computeElapsedMs", () => {
  it("returns elapsed time from startedAt with server skew", () => {
    const now = new Date("2026-01-01T12:05:00.000Z").getTime();
    expect(computeElapsedMs(stopwatch, 0, now)).toBe(5 * 60 * 1000);
  });

  it("applies positive server skew", () => {
    const now = new Date("2026-01-01T12:05:00.000Z").getTime();
    expect(computeElapsedMs(stopwatch, 30_000, now)).toBe(5 * 60 * 1000 + 30_000);
  });

  it("never returns negative elapsed", () => {
    const now = new Date("2026-01-01T11:59:00.000Z").getTime();
    expect(computeElapsedMs(stopwatch, 0, now)).toBe(0);
  });
});

describe("formatTimerDisplay", () => {
  it("formats stopwatch elapsed time", () => {
    const result = formatTimerDisplay(stopwatch, 90_000);
    expect(result.label).toBe("00:01:30");
    expect(result.overtime).toBe(false);
  });

  it("formats pomodoro remaining and overtime", () => {
    const pomodoro: ActiveTimerSession = {
      ...stopwatch,
      mode: "pomodoro",
      targetDurationMin: 25,
    };

    const running = formatTimerDisplay(pomodoro, 5 * 60 * 1000);
    expect(running.label).toBe("20:00");
    expect(running.overtime).toBe(false);

    const overtime = formatTimerDisplay(pomodoro, 26 * 60 * 1000);
    expect(overtime.overtime).toBe(true);
  });
});
