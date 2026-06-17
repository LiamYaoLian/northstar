"use client";

import { useCallback, useEffect, useState } from "react";
import { TaskCard } from "@/components/task-card";
import { SortableTaskList } from "@/components/sortable-task-list";
import { apiFetch } from "@/lib/api-client";
import { useLocale } from "@/lib/i18n/context";
import { translatePillar } from "@/lib/i18n/entities";
import type { Task, Subtask } from "@/lib/db/schema";

type TaskRow = Task & {
  pillarName?: string;
  pillarColor?: string;
  subtasks?: Subtask[];
};

export default function TasksPage() {
  const { locale, t } = useLocale();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pillars, setPillars] = useState<{ id: string; name: string; color: string }[]>([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [tasksData, strategyData] = await Promise.all([
        apiFetch<{ tasks: TaskRow[] }>("/api/tasks?sort=manual"),
        apiFetch<{ strategy: { pillars: { id: string; name: string; color: string }[] } | null }>(
          "/api/strategy",
        ),
      ]);
      const pillarMap = new Map(
        strategyData.strategy?.pillars?.map((p) => [p.id, p]) ?? [],
      );
      setPillars(strategyData.strategy?.pillars ?? []);
      setTasks(
        tasksData.tasks.map((t) => {
          const pillar = t.pillarId ? pillarMap.get(t.pillarId) : null;
          return {
            ...t,
            pillarName: pillar?.name,
            pillarColor: pillar?.color,
          };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.loadFailed);
    }
  }, [t.errors.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setError(null);
      await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), autoBreakdown: true }),
      });
      setTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.addTaskFailed);
    }
  }

  async function breakdownTask(taskId: string, userPrompt?: string) {
    try {
      setError(null);
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

  async function addSubtask(taskId: string, stTitle: string, isEntryPoint: boolean) {
    try {
      setError(null);
      await apiFetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: stTitle, isEntryPoint }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.addSubtaskFailed);
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

  async function reorderTasks(orderedIds: string[]) {
    try {
      await apiFetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.reorderTasksFailed);
      throw err;
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

  async function patchTask(id: string, body: Record<string, unknown>) {
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.updateTaskFailed);
    }
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t.tasks.title}</h2>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void load()}
          >
            {t.common.retry}
          </button>
        </div>
      )}

      <form onSubmit={addTask} className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
          placeholder={t.tasks.placeholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm text-white"
        >
          {t.common.add}
        </button>
      </form>

      <p className="text-xs text-muted">
        {t.tasks.hint}
        {pillars.length > 0 &&
          ` · ${t.tasks.categorized}：${pillars.map((p) => translatePillar(p.name, locale)).join(" · ")}`}
      </p>

      <SortableTaskList
        taskIds={tasks.map((t) => t.id)}
        onReorder={reorderTasks}
      >
        {(taskId) => {
          const task = taskMap.get(taskId);
          if (!task) return null;
          return (
            <TaskCard
              task={task}
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
          );
        }}
      </SortableTaskList>
    </div>
  );
}
