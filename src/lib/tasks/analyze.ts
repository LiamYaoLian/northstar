import { findWorkPillar, WORK_PILLAR_NAME } from "@/lib/pillars";
import { z } from "zod";
import { parseJson } from "@/lib/utils";
import type { FocusTrack, StrategicPillar } from "@/lib/db/schema";
import {
  ruleBasedClassify,
  type ClassifyResult,
  type PillarRef,
} from "@/lib/tasks/classify";
import {
  ruleBasedEstimateTime,
  type EstimateResult,
} from "@/lib/tasks/estimate-time";
import { suggestFocusTrack } from "@/lib/priority";
import {
  normalizeRecurrenceInference,
  ruleBasedInferRecurrence,
  type RecurrenceInference,
} from "@/lib/tasks/infer-recurrence";
import { recurrenceTypeSchema } from "@/lib/api/tasks/schemas";

export type TaskAnalyzeResult = {
  classification: ClassifyResult;
  estimate: EstimateResult;
  recurrence: RecurrenceInference;
};

const AnalyzeResponseSchema = z.object({
  pillarName: z.string(),
  focusTrack: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  estimatedMin: z.number().int().positive(),
  recurrenceType: recurrenceTypeSchema.optional().default("none"),
  recurrenceDays: z.array(z.number().int().min(1).max(7)).nullable().optional(),
  recurrenceCarryOver: z.boolean().optional().default(false),
});

function findPillar(pillars: PillarRef[], name: string) {
  return pillars.find((p) => p.name === name) ?? null;
}

function resolvePillarChoice(
  title: string,
  pillars: PillarRef[],
  pillarName: string,
  focusTrack: string | null | undefined,
  confidence?: number,
): ClassifyResult | null {
  const pillar = findPillar(pillars, pillarName);
  if (!pillar) return null;

  const workPillar = findWorkPillar(pillars);
  let resolvedFocus: string | null = null;

  if (pillar.id === workPillar?.id) {
    const tracks = parseJson<FocusTrack[]>(pillar.focusTracks, []);
    if (focusTrack && tracks.some((t) => t.name === focusTrack)) {
      resolvedFocus = focusTrack;
    } else {
      resolvedFocus = suggestFocusTrack(title, pillar as StrategicPillar);
    }
  }

  return {
    pillarId: pillar.id,
    pillarName: pillar.name,
    focusTrack: resolvedFocus,
    confidence,
    source: "openai",
    match: "llm",
  };
}

async function openAiAnalyze(
  title: string,
  pillars: PillarRef[],
): Promise<TaskAnalyzeResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const pillarOptions = pillars.map((p) => ({
    name: p.name,
    focusTracks:
      p.name === WORK_PILLAR_NAME
        ? parseJson<FocusTrack[]>(p.focusTracks, []).map((t) => t.name)
        : [],
  }));

  const system = `你是任务分析助手。根据任务标题，完成战略归类并估计完成所需分钟数。
可选 pillar（必须原样使用 name 字段）：
${JSON.stringify(pillarOptions, null, 2)}

规则：
- pillarName 必须是上述 name 之一
- 仅当 pillar 为「工作」时填写 focusTrack（进大厂 / 探索方向 / 投资 之一），否则 focusTrack 为 null
- confidence 为 0-1，表示归类把握程度
- estimatedMin 为完成整项任务的合理分钟数（正整数）；若标题已含时长（如「晨跑 30min」）应尊重该时长
- recurrenceType 为 none | daily | weekly：习惯/例行（晨跑、冥想、记账）倾向 daily；标题含具体周几用 weekly 并填 recurrenceDays（1=周一…7=周日）；一次性交付（交报告、买机票）为 none
- recurrenceDays 仅 weekly 时填写整数数组，否则 null
- recurrenceCarryOver 默认 false；仅 weekly 且语义含补做/顺延时为 true
- 只返回 JSON：{"pillarName":"...","focusTrack":null,"confidence":0.9,"estimatedMin":45,"recurrenceType":"daily","recurrenceDays":null,"recurrenceCarryOver":false}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ title: title.trim() }) },
      ],
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = AnalyzeResponseSchema.parse(JSON.parse(content));
    const classification = resolvePillarChoice(
      title,
      pillars,
      parsed.pillarName,
      parsed.focusTrack,
      parsed.confidence,
    );
    if (!classification) return null;

    return {
      classification,
      estimate: { estimatedMin: parsed.estimatedMin, source: "openai" },
      recurrence: normalizeRecurrenceInference({
        recurrenceType: parsed.recurrenceType,
        recurrenceDays: parsed.recurrenceDays ?? undefined,
        recurrenceCarryOver: parsed.recurrenceCarryOver,
        source: "openai",
      }),
    };
  } catch {
    return null;
  }
}

/** LLM classify + estimate in one call; rule-based fallback when no key or LLM fails. */
export async function analyzeTaskTitle(
  title: string,
  pillars: PillarRef[],
): Promise<TaskAnalyzeResult> {
  const trimmed = title.trim();
  if (!trimmed || pillars.length === 0) {
    return {
      classification: ruleBasedClassify(title, pillars),
      estimate: ruleBasedEstimateTime(title),
      recurrence: ruleBasedInferRecurrence(title),
    };
  }

  const ai = await openAiAnalyze(trimmed, pillars);
  if (ai) return ai;

  return {
    classification: ruleBasedClassify(trimmed, pillars),
    estimate: ruleBasedEstimateTime(trimmed),
    recurrence: ruleBasedInferRecurrence(trimmed),
  };
}
