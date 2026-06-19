import { z } from "zod";
import { ruleBasedBreakdown } from "@/lib/ai/breakdown";

export type EstimateResult = {
  estimatedMin: number | null;
  source: "openai" | "rules";
};

const EstimateMinutesSchema = z.object({
  estimatedMin: z.number().int().positive(),
});

/** Parse explicit durations like "晨跑 30min" or "review deck 1.5h". */
export function parseExplicitDuration(title: string): number | null {
  const minMatch = title.match(/(\d+)\s*(?:min|分钟|mins?)\b/i);
  if (minMatch) return parseInt(minMatch[1], 10);

  const hourMatch = title.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs?|hour|hours?|小时)/i);
  if (hourMatch) return Math.round(parseFloat(hourMatch[1]) * 60);

  return null;
}

/** Rule-based fallback when LLM is unavailable or fails. */
export function ruleBasedEstimateTime(title: string): EstimateResult {
  const trimmed = title.trim();
  if (!trimmed) {
    return { estimatedMin: null, source: "rules" };
  }

  const explicit = parseExplicitDuration(trimmed);
  if (explicit != null && explicit > 0) {
    return { estimatedMin: explicit, source: "rules" };
  }

  const breakdown = ruleBasedBreakdown(trimmed);
  if (breakdown.estimatedMinTotal != null && breakdown.estimatedMinTotal > 0) {
    return { estimatedMin: breakdown.estimatedMinTotal, source: "rules" };
  }

  return { estimatedMin: 30, source: "rules" };
}

async function openAiEstimateMinutes(title: string): Promise<EstimateResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const trimmed = title.trim();
  if (!trimmed) return null;

  const system = `你是任务用时估算助手。根据单个子步骤标题，估算完成该步骤所需的分钟数（正整数）。
若标题已含明确时长（如「2min」「15 分钟」），应尊重该时长。
只返回 JSON：{"estimatedMin":45}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ title: trimmed }) },
      ],
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = EstimateMinutesSchema.parse(JSON.parse(content));
    return { estimatedMin: parsed.estimatedMin, source: "openai" };
  } catch {
    return null;
  }
}

export async function estimateTaskMinutes(title: string): Promise<EstimateResult> {
  const ai = await openAiEstimateMinutes(title);
  if (ai) return ai;
  return ruleBasedEstimateTime(title);
}
