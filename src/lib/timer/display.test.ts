import { describe, expect, it } from "vitest";
import {
  formatPomodoroRemaining,
  formatStopwatchElapsed,
  isPomodoroOvertime,
} from "./display";

describe("formatStopwatchElapsed", () => {
  it("formats hours, minutes, and seconds", () => {
    expect(formatStopwatchElapsed(3_661_000)).toBe("01:01:01");
    expect(formatStopwatchElapsed(0)).toBe("00:00:00");
    expect(formatStopwatchElapsed(45_000)).toBe("00:00:45");
  });
});

describe("formatPomodoroRemaining", () => {
  it("shows remaining time before target", () => {
    expect(formatPomodoroRemaining(5 * 60_000, 25)).toBe("20:00");
    expect(formatPomodoroRemaining(0, 25)).toBe("25:00");
  });

  it("shows overtime with plus prefix after target", () => {
    expect(formatPomodoroRemaining(25 * 60_000, 25)).toBe("+00:00");
    expect(formatPomodoroRemaining(26 * 60_000, 25)).toBe("+01:00");
    expect(formatPomodoroRemaining(25 * 60_000 + 45_000, 25)).toBe("+00:45");
  });
});

describe("isPomodoroOvertime", () => {
  it("is false before target and true at or after target", () => {
    expect(isPomodoroOvertime(24 * 60_000, 25)).toBe(false);
    expect(isPomodoroOvertime(25 * 60_000, 25)).toBe(true);
    expect(isPomodoroOvertime(30 * 60_000, 25)).toBe(true);
  });
});
