export type TimerMode = "stopwatch" | "pomodoro";

export type ActiveTimerSession = {
  id: string;
  taskId: string;
  mode: TimerMode;
  startedAt: string;
  targetDurationMin: number | null;
  note: string | null;
};

export type ActiveTimerTask = {
  id: string;
  title: string;
  status: string;
};

export type ActiveTimerPayload = {
  session: ActiveTimerSession;
  task: ActiveTimerTask | null;
  serverNow: string;
};
