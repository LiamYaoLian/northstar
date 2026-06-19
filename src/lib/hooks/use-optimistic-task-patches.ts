"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { TaskRow } from "@/lib/tasks/enrich-tasks";

export function useOptimisticTaskPatches(
  setTasks: Dispatch<SetStateAction<TaskRow[]>>,
  setTodayTasks?: Dispatch<SetStateAction<TaskRow[]>>,
) {
  const applyOptimisticTaskPatch = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      let snapshotTasks: TaskRow[] | null = null;
      let snapshotToday: TaskRow[] | null = null;

      setTasks((current) => {
        snapshotTasks = current;
        return current.map((task) =>
          task.id === id ? { ...task, ...patch } : task,
        );
      });

      if (setTodayTasks) {
        setTodayTasks((current) => {
          snapshotToday = current;
          return current.map((task) =>
            task.id === id ? { ...task, ...patch } : task,
          );
        });
      }

      return () => {
        if (snapshotTasks) setTasks(snapshotTasks);
        if (snapshotToday && setTodayTasks) setTodayTasks(snapshotToday);
      };
    },
    [setTasks, setTodayTasks],
  );

  const applyOptimisticSubtaskPatch = useCallback(
    (subtaskId: string, patch: Record<string, unknown>) => {
      let snapshotTasks: TaskRow[] | null = null;
      let snapshotToday: TaskRow[] | null = null;

      const updateTaskSubtask = (task: TaskRow): TaskRow => {
        const subtasks = task.subtasks;
        if (!subtasks?.some((subtask) => subtask.id === subtaskId)) return task;
        return {
          ...task,
          subtasks: subtasks.map((subtask) =>
            subtask.id === subtaskId ? { ...subtask, ...patch } : subtask,
          ),
        };
      };

      setTasks((current) => {
        snapshotTasks = current;
        return current.map(updateTaskSubtask);
      });

      if (setTodayTasks) {
        setTodayTasks((current) => {
          snapshotToday = current;
          return current.map(updateTaskSubtask);
        });
      }

      return () => {
        if (snapshotTasks) setTasks(snapshotTasks);
        if (snapshotToday && setTodayTasks) setTodayTasks(snapshotToday);
      };
    },
    [setTasks, setTodayTasks],
  );

  return { applyOptimisticTaskPatch, applyOptimisticSubtaskPatch };
}
