"use client";

import { useCallback, useEffect, useState } from "react";
import { TaskCard } from "@/components/task-card";
import { apiFetch } from "@/lib/api-client";
import type { Task, Subtask } from "@/lib/db/schema";

type TaskRow = Task & {
  pillarName?: string;
  pillarColor?: string;
  subtasks?: Subtask[];
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pillars, setPillars] = useState<{ id: string; name: string; color: string }[]>([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [tasksData, strategyData] = await Promise.all([
        apiFetch<{ tasks: TaskRow[] }>("/api/tasks"),
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
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, []);

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
      setError(err instanceof Error ? err.message : "添加任务失败");
    }
  }

  async function breakdownTask(taskId: string) {
    try {
      setError(null);
      await apiFetch(`/api/tasks/${taskId}/breakdown`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "拆解失败");
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
      setError(err instanceof Error ? err.message : "更新子任务失败");
    }
  }

  async function addSubtask(taskId: string, title: string, isEntryPoint: boolean) {
    try {
      setError(null);
      await apiFetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, isEntryPoint }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加子任务失败");
      throw err;
    }
  }

  async function deleteSubtask(subtaskId: string) {
    try {
      await apiFetch(`/api/subtasks/${subtaskId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除子任务失败");
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
      setError(err instanceof Error ? err.message : "更新任务失败");
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Tasks</h2>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void load()}
          >
            重试
          </button>
        </div>
      )}

      <form onSubmit={addTask} className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
          placeholder="新任务，如：准备投资人 deck、刷 LC 题..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm text-white"
        >
          添加
        </button>
      </form>

      <p className="text-xs text-muted">
        点「手动拆解」逐步添加子任务，或点「AI 拆解」自动生成
        {pillars.length > 0 && ` · 归类：${pillars.map((p) => p.name).join(" · ")}`}
      </p>

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onBreakdown={breakdownTask}
            onAddSubtask={addSubtask}
            onDeleteSubtask={(id) => void deleteSubtask(id)}
            onToggleSubtask={toggleSubtask}
            onPin={(id, pinned) => void patchTask(id, { isPinned: pinned })}
            onComplete={(id) => void patchTask(id, { status: "done" })}
            onLogTime={(id, minutes) =>
              void apiFetch("/api/time-entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId: id, durationMin: minutes }),
              })
                .then(() => load())
                .catch((err) =>
                  setError(err instanceof Error ? err.message : "记时失败"),
                )
            }
          />
        ))}
      </div>
    </div>
  );
}
