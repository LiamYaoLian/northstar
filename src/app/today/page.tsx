"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TaskCard } from "@/components/task-card";
import { apiFetch } from "@/lib/api-client";
import type { Task, Subtask } from "@/lib/db/schema";

type TaskRow = Task & {
  pillarName?: string;
  pillarColor?: string;
  subtasks?: Subtask[];
};

export default function TodayPage() {
  const router = useRouter();
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
          ? new Date(today[0].priorityComputedAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, [router]);

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
      setError(err instanceof Error ? err.message : "更新失败");
    }
  }

  async function breakdownTask(taskId: string) {
    try {
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

  async function reorderSubtasks(taskId: string, orderedIds: string[]) {
    try {
      await apiFetch(`/api/tasks/${taskId}/subtasks/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "子任务排序失败");
      throw err;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Today</h2>
        <p className="text-sm text-muted">自动排序 · 上次更新 {updatedAt}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-muted">
          暂无待办。去 <a href="/tasks" className="text-accent">Tasks</a> 添加。
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
        ))
      )}

      <a href="/tasks" className="text-sm text-accent">
        查看全部待办 →
      </a>
    </div>
  );
}
