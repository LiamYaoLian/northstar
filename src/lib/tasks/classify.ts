import { findWorkPillar, WORK_PILLAR_NAME } from "@/lib/pillars";
import { z } from "zod";
import { suggestFocusTrack } from "@/lib/priority";
import { parseJson } from "@/lib/utils";
import type { FocusTrack, StrategicPillar } from "@/lib/db/schema";

export type PillarRef = Pick<StrategicPillar, "id" | "name" | "focusTracks">;

export type ClassifyResult = {
  pillarId: string | null;
  pillarName: string | null;
  focusTrack: string | null;
  confidence?: number;
  source: "openai" | "rules";
  match: "llm" | "keyword" | "default_work" | "none";
};

const ClassifyResponseSchema = z.object({
  pillarName: z.string(),
  focusTrack: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

function findPillar(pillars: PillarRef[], name: string) {
  return pillars.find((p) => p.name === name) ?? null;
}

const PILLAR_PATTERNS: { pattern: RegExp; pillarName: string }[] = [
  {
    pattern: new RegExp(
      [
        "跑步|晨跑|锻炼|健身|睡眠|冥想|体检|瑜伽|增肌|力量|有氧|游泳|椭圆|蛋白",
        "workout|gym|run|running|sleep|health|yoga|fitness|exercise|training|train",
        "muscle|cardio|lift|lifting|weights?|strength|swim|swimming|walk|walking|hike",
        "stretch|pilates|crossfit|wellness|nutrition|diet|meditat",
      ].join("|"),
      "i",
    ),
    pillarName: "健康",
  },
  {
    pattern:
      /陪伴|家庭|晚餐|约会|朋友|亲子|family|dinner|date|partner|spouse|kid|parent|visit|hangout|social/i,
    pillarName: "关系",
  },
  {
    pattern:
      /游戏|追剧|电影|放松|爱好|game|gaming|netflix|movie|hobby|relax|tv|show|read(ing)?|music/i,
    pillarName: "娱乐",
  },
  {
    pattern:
      /家务|账单|快递|预约|通勤|chore|bill|laundry|grocer|errand|admin|commute|clean|dishes|tax|mail/i,
    pillarName: "琐事",
  },
];

/** Rule-based fallback when LLM is unavailable or fails. */
export function ruleBasedClassify(
  title: string,
  pillars: PillarRef[],
): ClassifyResult {
  const trimmed = title.trim();
  if (!trimmed || pillars.length === 0) {
    return {
      pillarId: null,
      pillarName: null,
      focusTrack: null,
      source: "rules",
      match: "none",
    };
  }

  const t = trimmed.toLowerCase();
  const workPillar = findWorkPillar(pillars);

  for (const rule of PILLAR_PATTERNS) {
    if (rule.pattern.test(t)) {
      const pillar = findPillar(pillars, rule.pillarName);
      if (!pillar) continue;
      return {
        pillarId: pillar.id,
        pillarName: pillar.name,
        focusTrack: null,
        source: "rules",
        match: "keyword",
      };
    }
  }

  if (workPillar) {
    return {
      pillarId: workPillar.id,
      pillarName: workPillar.name,
      focusTrack: suggestFocusTrack(trimmed, workPillar as StrategicPillar),
      source: "rules",
      match: "default_work",
    };
  }

  return {
    pillarId: null,
    pillarName: null,
    focusTrack: null,
    source: "rules",
    match: "none",
  };
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

async function openAiClassify(
  title: string,
  pillars: PillarRef[],
): Promise<ClassifyResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const pillarOptions = pillars.map((p) => ({
    name: p.name,
    focusTracks:
      p.name === WORK_PILLAR_NAME
        ? parseJson<FocusTrack[]>(p.focusTracks, []).map((t) => t.name)
        : [],
  }));

  const system = `你是任务归类助手。根据任务标题，将其归入且仅归入一个战略 pillar。
可选 pillar（必须原样使用 name 字段）：
${JSON.stringify(pillarOptions, null, 2)}

规则：
- pillarName 必须是上述 name 之一
- 仅当 pillar 为「工作」时填写 focusTrack（进大厂 / 探索方向 / 投资 之一），否则 focusTrack 为 null
- confidence 为 0-1，表示把握程度
- 只返回 JSON：{"pillarName":"...","focusTrack":null,"confidence":0.9}`;

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
    const parsed = ClassifyResponseSchema.parse(JSON.parse(content));
    return resolvePillarChoice(
      title,
      pillars,
      parsed.pillarName,
      parsed.focusTrack,
      parsed.confidence,
    );
  } catch {
    return null;
  }
}

/** LLM first; rule-based fallback when no key or LLM fails. */
export async function classifyTaskTitle(
  title: string,
  pillars: PillarRef[],
): Promise<ClassifyResult> {
  const trimmed = title.trim();
  if (!trimmed || pillars.length === 0) {
    return ruleBasedClassify(title, pillars);
  }

  const ai = await openAiClassify(trimmed, pillars);
  if (ai) return ai;

  return ruleBasedClassify(trimmed, pillars);
}
