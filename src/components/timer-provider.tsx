"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useLocale } from "@/lib/i18n/context";
import type { ActiveTimerPayload } from "@/lib/services/timer-types";
import {
  computeElapsedMs,
  formatTimerDisplay,
} from "@/lib/timer/elapsed";

type TimerContextValue = {
  active: ActiveTimerPayload | null;
  displayLabel: string;
  overtime: boolean;
  busy: boolean;
  isRunningOnTask: (taskId: string) => boolean;
  otherRunningTaskTitle: string | null;
  startStopwatch: (taskId: string) => Promise<void>;
  startPomodoro: (taskId: string, targetDurationMin: number) => Promise<void>;
  stop: () => Promise<void>;
  cancel: () => Promise<void>;
  registerOnStop: (listener: () => void) => () => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const [active, setActive] = useState<ActiveTimerPayload | null>(null);
  const [serverSkewMs, setServerSkewMs] = useState(0);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const stopListeners = useRef(new Set<() => void>());

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<{ session: ActiveTimerPayload | null }>(
        "/api/timer",
      );
      if (data.session) {
        setActive(data.session);
        setServerSkewMs(
          new Date(data.session.serverNow).getTime() - Date.now(),
        );
      } else {
        setActive(null);
        setServerSkewMs(0);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setActive(null);
        setServerSkewMs(0);
        return;
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const elapsedMs = useMemo(() => {
    if (!active) return 0;
    void tick;
    return computeElapsedMs(active.session, serverSkewMs);
  }, [active, serverSkewMs, tick]);

  const { label: displayLabel, overtime } = useMemo(() => {
    if (!active) {
      return { label: "", overtime: false };
    }
    return formatTimerDisplay(active.session, elapsedMs);
  }, [active, elapsedMs]);

  const startTimer = useCallback(
    async (
      taskId: string,
      mode: "stopwatch" | "pomodoro",
      targetDurationMin?: number,
    ) => {
      setBusy(true);
      try {
        const data = await apiFetch<{ session: ActiveTimerPayload }>(
          "/api/timer/start",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId,
              mode,
              targetDurationMin: targetDurationMin ?? null,
            }),
          },
        );
        setActive(data.session);
        setServerSkewMs(
          new Date(data.session.serverNow).getTime() - Date.now(),
        );
      } catch (err) {
        throw new Error(
          err instanceof Error ? err.message : t.errors.startTimerFailed,
        );
      } finally {
        setBusy(false);
      }
    },
    [t.errors.startTimerFailed],
  );

  const startStopwatch = useCallback(
    (taskId: string) => startTimer(taskId, "stopwatch"),
    [startTimer],
  );

  const startPomodoro = useCallback(
    (taskId: string, targetDurationMin: number) =>
      startTimer(taskId, "pomodoro", targetDurationMin),
    [startTimer],
  );

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      await apiFetch("/api/timer/stop", { method: "POST" });
      setActive(null);
      setServerSkewMs(0);
      for (const listener of stopListeners.current) {
        listener();
      }
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : t.errors.stopTimerFailed,
      );
    } finally {
      setBusy(false);
    }
  }, [t.errors.stopTimerFailed]);

  const cancel = useCallback(async () => {
    setBusy(true);
    try {
      await apiFetch("/api/timer/cancel", { method: "POST" });
      setActive(null);
      setServerSkewMs(0);
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : t.errors.cancelTimerFailed,
      );
    } finally {
      setBusy(false);
    }
  }, [t.errors.cancelTimerFailed]);

  const registerOnStop = useCallback((listener: () => void) => {
    stopListeners.current.add(listener);
    return () => {
      stopListeners.current.delete(listener);
    };
  }, []);

  const isRunningOnTask = useCallback(
    (taskId: string) => active?.session.taskId === taskId,
    [active],
  );

  const otherRunningTaskTitle = useMemo(() => {
    if (!active) return null;
    return active.task?.title ?? t.timer.orphanTask;
  }, [active, t.timer.orphanTask]);

  const value = useMemo(
    (): TimerContextValue => ({
      active,
      displayLabel,
      overtime,
      busy,
      isRunningOnTask,
      otherRunningTaskTitle,
      startStopwatch,
      startPomodoro,
      stop,
      cancel,
      registerOnStop,
    }),
    [
      active,
      displayLabel,
      overtime,
      busy,
      isRunningOnTask,
      otherRunningTaskTitle,
      startStopwatch,
      startPomodoro,
      stop,
      cancel,
      registerOnStop,
    ],
  );

  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error("useTimer must be used within TimerProvider");
  }
  return ctx;
}
