"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { ONBOARDING_SEED_TASKS } from "@/lib/onboarding/seed-tasks";
import type { StrategyCritique } from "@/lib/strategy/critique";
import type { StrategyResponse } from "@/lib/strategy/view-types";

export type OnboardingFormState = {
  horizon: string;
  hoursPerWeek: number;
  brainDump: string;
  workTrack: string;
  northStar: string;
};

export function useOnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [critique, setCritique] = useState<StrategyCritique | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<OnboardingFormState>({
    horizon: "2026 Q2",
    hoursPerWeek: 40,
    brainDump: "",
    workTrack: "big_tech",
    northStar:
      "本季度在保持健康、关系的前提下，在工作主赛道上取得可验证进展。",
  });

  const updateForm = useCallback((patch: Partial<OnboardingFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  const runCritique = useCallback(async () => {
    const data = await apiFetch<{ critique: StrategyCritique }>("/api/critique", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brainDump: form.brainDump }),
    });
    setCritique(data.critique);
    setStep(3);
  }, [form.brainDump]);

  const finish = useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "template",
          workTrack: form.workTrack,
          statement: form.northStar,
          horizon: form.horizon,
          hoursPerWeek: Number(form.hoursPerWeek),
        }),
      });

      const { strategy } = await apiFetch<StrategyResponse>("/api/strategy");
      const pillarMap = new Map(
        (strategy?.pillars ?? []).map((p) => [p.name, p.id]),
      );

      for (const task of ONBOARDING_SEED_TASKS) {
        const pillarId =
          "pillarName" in task && task.pillarName
            ? pillarMap.get(task.pillarName)
            : pillarMap.get("工作");
        await apiFetch("/api/tasks", {
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

      router.push("/tasks");
    } finally {
      setLoading(false);
    }
  }, [form, router]);

  return {
    step,
    setStep,
    critique,
    setCritique,
    loading,
    form,
    updateForm,
    runCritique,
    finish,
  };
}
