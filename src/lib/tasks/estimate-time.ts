import { ruleBasedBreakdown } from "@/lib/ai/breakdown";

export type EstimateResult = {
  estimatedMin: number | null;
  source: "openai" | "rules";
};

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

export async function estimateTaskMinutes(title: string): Promise<EstimateResult> {
  return ruleBasedEstimateTime(title);
}
