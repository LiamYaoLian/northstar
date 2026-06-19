import type { ActiveTimerPayload } from "@/lib/services/timer-types";

export class TimerNotFoundError extends Error {
  readonly status = 404;

  constructor(message = "No active timer") {
    super(message);
    this.name = "TimerNotFoundError";
  }
}

export class TimerTaskNotFoundError extends Error {
  readonly status = 404;

  constructor(message = "Task not found") {
    super(message);
    this.name = "TimerTaskNotFoundError";
  }
}

export class TimerTaskDeletedError extends Error {
  readonly status = 410;

  constructor(message = "Task no longer exists") {
    super(message);
    this.name = "TimerTaskDeletedError";
  }
}

export class TimerInvalidInputError extends Error {
  readonly status = 400;

  constructor(message = "Invalid timer input") {
    super(message);
    this.name = "TimerInvalidInputError";
  }
}

export class TimerAlreadyRunningError extends Error {
  readonly status = 409;

  constructor(
    message: string,
    readonly active: ActiveTimerPayload,
  ) {
    super(message);
    this.name = "TimerAlreadyRunningError";
  }
}

export function isTimerServiceError(
  err: unknown,
): err is { status: number; message: string } {
  return (
    err instanceof TimerNotFoundError ||
    err instanceof TimerTaskNotFoundError ||
    err instanceof TimerTaskDeletedError ||
    err instanceof TimerInvalidInputError ||
    err instanceof TimerAlreadyRunningError
  );
}
