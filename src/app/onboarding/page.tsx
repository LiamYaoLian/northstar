"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { WORK_TRACK_PRESETS } from "@/lib/strategy/templates";
import type { StrategyCritique } from "@/lib/strategy/critique";

type Step = 1 | 2 | 3 | 4 | 5;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [horizon, setHorizon] = useState("2026 Q2");
  const [hoursPerWeek, setHoursPerWeek] = useState(40);
  const [brainDump, setBrainDump] = useState("");
  const [critique, setCritique] = useState<StrategyCritique | null>(null);
  const [workTrack, setWorkTrack] = useState("big_tech");
  const [northStar, setNorthStar] = useState(
    "本季度在保持健康、关系的前提下，在工作主赛道上取得可验证进展。",
  );
  const [loading, setLoading] = useState(false);

  async function runCritique() {
    const res = await fetch("/api/critique", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brainDump }),
    });
    const data = await res.json();
    setCritique(data.critique);
    setStep(3);
  }

  async function finish() {
    setLoading(true);
    const res = await fetch("/api/strategy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "template",
        workTrack,
        statement: northStar,
        horizon,
        hoursPerWeek: Number(hoursPerWeek),
      }),
    });
    await res.json();

    const seedTasks = [
      { title: "LeetCode 本周 3 题", focusTrack: "进大厂" },
      { title: "周日投资复盘 1h", focusTrack: "投资" },
      { title: "晨跑 30min", pillarName: "健康" },
      { title: "周三家庭晚餐", pillarName: "关系" },
    ];

    const strategyRes = await fetch("/api/strategy");
    const { strategy } = await strategyRes.json();
    const pillarMap = new Map(
      strategy.pillars.map((p: { name: string; id: string }) => [p.name, p.id]),
    );

    for (const t of seedTasks) {
      const pillarId =
        "pillarName" in t && t.pillarName
          ? pillarMap.get(t.pillarName)
          : pillarMap.get("工作");
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t.title,
          pillarId,
          focusTrack: "focusTrack" in t ? t.focusTrack : undefined,
          estimatedMin: 30,
        }),
      });
    }

    setLoading(false);
    router.push("/today");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">定义你的战略</h2>
        <p className="text-sm text-muted">步骤 {step} / 5</p>
      </div>

      {step === 1 && (
        <Card className="space-y-4">
          <label className="block text-sm">
            周期
            <input
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            每周可规划小时数
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="rounded-md bg-accent px-4 py-2 text-sm text-white"
          >
            下一步
          </button>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-4">
          <p className="text-sm text-muted">
            随便写：这个周期你最想达成什么？什么让你焦虑？哪些事占用大量时间但不能删？
          </p>
          <textarea
            className="min-h-40 w-full rounded-md border border-border px-3 py-2 text-sm"
            placeholder="例：我是 senior SDE，想进大厂，也在探索方向，要兼顾健康和家庭..."
            value={brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              上一步
            </button>
            <button
              type="button"
              onClick={() => void runCritique()}
              className="rounded-md bg-accent px-4 py-2 text-sm text-white"
            >
              分析并继续
            </button>
            <button
              type="button"
              onClick={() => {
                setCritique(null);
                setStep(3);
              }}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              跳过，用模板
            </button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="space-y-4">
          {critique && critique.findings.length > 0 && (
            <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm">
              <p className="font-medium text-amber-800">战略诊断</p>
              {critique.findings.map((f) => (
                <p key={f.code} className="text-amber-900">
                  · {f.message}
                </p>
              ))}
            </div>
          )}

          {critique?.requiresWorkTrackChoice && (
            <div className="space-y-2">
              <p className="text-sm font-medium">本季度 Work 主赛道</p>
              {Object.entries(WORK_TRACK_PRESETS).map(([key, preset]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="workTrack"
                    checked={workTrack === key}
                    onChange={() => setWorkTrack(key)}
                  />
                  {preset.label}
                </label>
              ))}
            </div>
          )}

          <label className="block text-sm">
            North Star
            <textarea
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
              value={northStar}
              onChange={(e) => setNorthStar(e.target.value)}
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              上一步
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="rounded-md bg-accent px-4 py-2 text-sm text-white"
            >
              确认预算
            </button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="space-y-3">
          <p className="text-sm font-medium">生活平衡型预算（可稍后在 Strategy 页调整）</p>
          <div className="space-y-2 text-sm">
            {[
              ["工作", "40%", "进大厂 / 探索 / 投资"],
              ["健康", "15%", "floor 硬约束"],
              ["关系", "15%", "floor 硬约束"],
              ["娱乐", "10%", "cap 12%"],
              ["琐事", "10%", "cap 12%"],
              ["缓冲", "10%", "未归类"],
            ].map(([name, pct, note]) => (
              <div key={name} className="flex justify-between border-b border-border py-2">
                <span>{name}</span>
                <span className="text-muted">
                  {pct} · {note}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            工作 {WORK_TRACK_PRESETS[workTrack].label}：
            {WORK_TRACK_PRESETS[workTrack].focusTracks
              .map((t) => `${t.name} ${t.shareOfParent}%`)
              .join(" · ")}
          </p>
          <button
            type="button"
            onClick={() => setStep(5)}
            className="rounded-md bg-accent px-4 py-2 text-sm text-white"
          >
            下一步
          </button>
        </Card>
      )}

      {step === 5 && (
        <Card className="space-y-4">
          <p className="text-sm">
            将创建战略并添加 4 个种子任务（LC、投资复盘、晨跑、家庭晚餐）。
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void finish()}
            className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {loading ? "创建中..." : "开始 Northstar"}
          </button>
        </Card>
      )}
    </div>
  );
}
