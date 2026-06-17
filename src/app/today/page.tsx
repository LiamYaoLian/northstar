"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskCard } from "@/components/task-card";
import { apiFetch } from "@/lib/api-client";
import { useLocale } from "@/lib/i18n/context";
import { localeTag } from "@/lib/i18n/entities";
import type { Task, Subtask } from "@/lib/db/schema";

type TaskRow = Task & {
  pillarName?: string;
  pillarColor?: string;
  subtasks?: Subtask[];
};

export default function TodayPage() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [tasksData, strategyData] = await Promise.all([
        apiFetch<{ tasks: TaskRow[] }>("/api/tasks"),
        apiFetch<{ hasStrategy: boolean; strategy: { pillars: { id: string; name: string; color: string }[] } | null }>(
          "/api/strategy",
        ),
      ]);

      if (!strategyData.hasStrategy) {
        router.replace("/onboarding");
        return;
      }

      const pillarMap = new Map(
        strategyData.strategy?.pillars?.map((p) => [p.id, p]) ?? [],
      );

      const today = tasksData.tasks
        .filter((t) => t.status !== "done")
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 5)
        .map((t) => {
          const pillar = t.pillarId ? pillarMap.get(t.pillarId) : null;
          return {
            ...t,
            pillarName: pillar?.name,
            pillarColor: pillar?.color,
          };
        });

      setTasks(today);
      setUpdatedAt(
        today[0]?.priorityComputedAt
          ? new Date(today[0].priorityComputedAt).toLocaleTimeString(
              localeTag(locale),
              { hour: "2-digit", minute: "2-digit" },
            )
          : "—",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.loadFailed);
    }
  }, [router, locale, t.errors.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchTask(id: string, body: Record<string, unknown>) {
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.updateFailed);
    }
  }

  async function breakdownTask(taskId: string, userPrompt?: string) {
    try {
      await apiFetch(`/api/tasks/${taskId}/breakdown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt ?? "" }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.breakdownFailed);
      throw err;
    }
  }

  async function toggleSubtask(subtaskId: string, isDone: boolean) {
    try {
      await apiFetch(`/api/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.updateSubtaskFailed);
    }
  }

  async function addSubtask(taskId: string, title: string, isEntryPoint: boolean) {
    try {
      await apiFetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, isEntryPoint }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.addSubtaskFailed);
      throw err;
    }
  }

  async function deleteSubtask(subtaskId: string) {
    try {
      await apiFetch(`/api/subtasks/${subtaskId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.deleteSubtaskFailed);
    }
  }

  async function reorderSubtasks(taskId: string, orderedIds: string[]) {
    try {
      await apiFetch(`/api/tasks/${taskId}/subtasks/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.reorderSubtasksFailed);
      throw err;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t.today.title}</h2>
        <p className="text-sm text-muted">
          {t.today.subtitle} {updatedAt}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-muted">
          {t.today.empty}{" "}
          <Link href="/tasks" className="text-accent">
            {t.nav.tasks}
          </Link>
          .
        </p>
      ) : (
        tasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            rank={i + 1}
            onBreakdown={breakdownTask}
            onAddSubtask={addSubtask}
            onDeleteSubtask={(id) => void deleteSubtask(id)}
            onReorderSubtasks={reorderSubtasks}
            onToggleSubtask={toggleSubtask}
            onPin={(id, pinned) => void patchTask(id, { isPinned: pinned })}
            onToggleIntimidating={(id, intimidating) =>
              void patchTask(id, { intimidationScore: intimidating ? 4 : 2 })
            }
            onComplete={(id) => void patchTask(id, { status: "done" })}
            onLogTime={(id, minutes) =>
              void apiFetch("/api/time-entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId: id, durationMin: minutes }),
              })
                .then(() => load())
                .catch((err) =>
                  setError(err instanceof Error ? err.message : t.errors.logTimeFailed),
                )
            }
          />
        ))
      )}

      <Link href="/tasks" className="text-sm text-accent">
        {t.today.viewAll}
      </Link>
    </div>
  );
}
