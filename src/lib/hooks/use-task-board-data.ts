"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { useLocale } from "@/lib/i18n/context";
import {
  enrichTasksWithPillars,
  enrichTasksWithProjects,
  parseStrategyPillars,
  toProjectOptions,
  type PillarOption,
  type ProjectOption,
  type TaskRow,
} from "@/lib/tasks/enrich-tasks";

type StrategyResponse = {
  hasStrategy: boolean;
  strategy: {
    pillars: {
      id: string;
      name: string;
      color: string;
      focusTracks: string | null;
    }[];
  } | null;
};

type ProjectsResponse = {
  projects: Array<{
    id: string;
    name: string;
    pillarId: string;
    focusTrack: string | null;
  }>;
};

type UseTaskBoardDataOptions = {
  includeTodayTasks?: boolean;
  requireAuth?: boolean;
  trackLoading?: boolean;
};

export function useTaskBoardData(options: UseTaskBoardDataOptions = {}) {
  const {
    includeTodayTasks = false,
    requireAuth = false,
    trackLoading = false,
  } = options;
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const { t } = useLocale();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [todayTasks, setTodayTasks] = useState<TaskRow[]>([]);
  const [pillars, setPillars] = useState<PillarOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(trackLoading);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      if (trackLoading) setLoading(true);
      setError(null);

      const tasksPromise = apiFetch<{ tasks: TaskRow[] }>("/api/tasks");
      const strategyPromise = apiFetch<StrategyResponse>("/api/strategy");
      const projectsPromise = apiFetch<ProjectsResponse>("/api/projects");
      const todayPromise = includeTodayTasks
        ? apiFetch<{ tasks: TaskRow[] }>("/api/tasks?status=today")
        : null;

      const [tasksData, strategyData, projectsData, todayData] = await Promise.all([
        tasksPromise,
        strategyPromise,
        projectsPromise,
        todayPromise ?? Promise.resolve(null),
      ]);

      if (!strategyData.hasStrategy) {
        router.replace("/onboarding");
        return;
      }

      const strategyPillars = parseStrategyPillars(
        strategyData.strategy?.pillars ?? [],
      );
      const projectOptions = toProjectOptions(projectsData.projects);
      setPillars(strategyPillars);
      setProjects(projectOptions);

      const enrich = (list: TaskRow[]) =>
        enrichTasksWithProjects(
          enrichTasksWithPillars(list, strategyPillars),
          projectOptions,
        );

      setTasks(enrich(tasksData.tasks));
      if (todayData) {
        setTodayTasks(enrich(todayData.tasks));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.loadFailed);
    } finally {
      if (trackLoading) setLoading(false);
    }
  }, [includeTodayTasks, router, t.errors.loadFailed, trackLoading]);

  useEffect(() => {
    if (requireAuth && sessionStatus !== "authenticated") return;
    void load();
  }, [load, requireAuth, sessionStatus]);

  return {
    tasks,
    setTasks,
    todayTasks,
    setTodayTasks,
    pillars,
    setPillars,
    projects,
    setProjects,
    loading,
    error,
    setError,
    reload: load,
    sessionStatus,
  };
}
