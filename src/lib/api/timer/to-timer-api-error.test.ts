import { describe, expect, it } from "vitest";
import {
  TimerAlreadyRunningError,
  TimerInvalidInputError,
  TimerNotFoundError,
  TimerTaskDeletedError,
  TimerTaskNotFoundError,
  isTimerServiceError,
} from "@/lib/services/timer-errors";
import type { ActiveTimerPayload } from "@/lib/services/timer-types";
import { toTimerApiError } from "@/lib/api/timer/to-timer-api-error";

const sampleActive: ActiveTimerPayload = {
  session: {
    id: "session-1",
    taskId: "task-1",
    mode: "stopwatch",
    startedAt: "2026-06-18T15:00:00.000Z",
    targetDurationMin: null,
    note: null,
  },
  task: {
    id: "task-1",
    title: "Sample",
    status: "todo",
  },
  serverNow: "2026-06-18T15:01:00.000Z",
};

describe("timer service errors", () => {
  it("identifies timer service errors", () => {
    expect(isTimerServiceError(new TimerNotFoundError())).toBe(true);
    expect(isTimerServiceError(new Error("other"))).toBe(false);
  });

  it("maps status codes for timer errors", () => {
    expect(new TimerTaskNotFoundError().status).toBe(404);
    expect(new TimerAlreadyRunningError("Timer already running", sampleActive).status).toBe(
      409,
    );
    expect(new TimerTaskDeletedError().status).toBe(410);
    expect(new TimerInvalidInputError().status).toBe(400);
  });
});

describe("toTimerApiError", () => {
  it("includes active session payload on conflict", async () => {
    const response = toTimerApiError(
      new TimerAlreadyRunningError("Timer already running", sampleActive),
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Timer already running");
    expect(body.session.session.id).toBe("session-1");
  });

  it("maps not found errors to 404", async () => {
    const response = toTimerApiError(new TimerNotFoundError());
    expect(response.status).toBe(404);
  });
});
