"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import {
  budgetTable,
  translateCritique,
  translateFocusTrack,
  translateWorkTrackKey,
} from "@/lib/i18n/entities";
import { WORK_TRACK_PRESETS } from "@/lib/strategy/templates";
import type { StrategyCritique } from "@/lib/strategy/critique";

type Step = 1 | 2 | 3 | 4 | 5;

export default function OnboardingPage() {
  const router = useRouter();
  const { locale, t } = useLocale();
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

    for (const task of seedTasks) {
      const pillarId =
        "pillarName" in task && task.pillarName
          ? pillarMap.get(task.pillarName)
          : pillarMap.get("工作");
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          pillarId,
          focusTrack: "focusTrack" in task ? task.focusTrack : undefined,
          estimatedMin: 30,
        }),
      });
    }

    setLoading(false);
    router.push("/today");
  }

  const budgetRows = budgetTable(locale);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t.onboarding.title}</h2>
        <p className="text-sm text-muted">
          {t.onboarding.step} {step} / 5
        </p>
      </div>

      {step === 1 && (
        <Card className="space-y-4">
          <label className="block text-sm">
            {t.onboarding.horizon}
            <input
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            {t.onboarding.hoursPerWeek}
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
            {t.common.next}
          </button>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-4">
          <p className="text-sm text-muted">{t.onboarding.brainDumpPrompt}</p>
          <textarea
            className="min-h-40 w-full rounded-md border border-border px-3 py-2 text-sm"
            placeholder={t.onboarding.brainDumpPlaceholder}
            value={brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              {t.common.back}
            </button>
            <button
              type="button"
              onClick={() => void runCritique()}
              className="rounded-md bg-accent px-4 py-2 text-sm text-white"
            >
              {t.onboarding.analyze}
            </button>
            <button
              type="button"
              onClick={() => {
                setCritique(null);
                setStep(3);
              }}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              {t.onboarding.skipTemplate}
            </button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="space-y-4">
          {critique && critique.findings.length > 0 && (
            <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm">
              <p className="font-medium text-amber-800">
                {t.onboarding.critiqueTitle}
              </p>
              {critique.findings.map((f) => (
                <p key={f.code} className="text-amber-900">
                  · {translateCritique(f.code, locale)}
                </p>
              ))}
            </div>
          )}

          {critique?.requiresWorkTrackChoice && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t.onboarding.workPrimaryTrack}
              </p>
              {Object.entries(WORK_TRACK_PRESETS).map(([key]) => (
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
                  {translateWorkTrackKey(key, locale)}
                </label>
              ))}
            </div>
          )}

          <label className="block text-sm">
            {t.onboarding.northStar}
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
              {t.common.back}
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="rounded-md bg-accent px-4 py-2 text-sm text-white"
            >
              {t.onboarding.confirmBudget}
            </button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="space-y-3">
          <p className="text-sm font-medium">{t.onboarding.budgetTitle}</p>
          <div className="space-y-2 text-sm">
            {budgetRows.map((row) => (
              <div
                key={row.name}
                className="flex justify-between border-b border-border py-2"
              >
                <span>{row.name}</span>
                <span className="text-muted">
                  {row.pct} · {row.note}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            {t.onboarding.budgetNote}{" "}
            {translateWorkTrackKey(workTrack, locale)}：
            {WORK_TRACK_PRESETS[workTrack].focusTracks
              .map(
                (tr) =>
                  `${translateFocusTrack(tr.name, locale)} ${tr.shareOfParent}%`,
              )
              .join(" · ")}
          </p>
          <button
            type="button"
            onClick={() => setStep(5)}
            className="rounded-md bg-accent px-4 py-2 text-sm text-white"
          >
            {t.common.next}
          </button>
        </Card>
      )}

      {step === 5 && (
        <Card className="space-y-4">
          <p className="text-sm">{t.onboarding.seedTasks}</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void finish()}
            className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {loading ? t.onboarding.creating : t.onboarding.start}
          </button>
        </Card>
      )}
    </div>
  );
}
