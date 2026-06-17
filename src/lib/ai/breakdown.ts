import { z } from "zod";

export const BreakdownItemSchema = z.object({
  title: z.string(),
  estimatedMin: z.number().optional(),
  isEntryPoint: z.boolean().optional(),
});

export type BreakdownItem = z.infer<typeof BreakdownItemSchema>;

export const BreakdownResultSchema = z.object({
  subtasks: z.array(BreakdownItemSchema).min(2).max(8),
  intimidationScore: z.number().min(1).max(5).optional(),
  estimatedMinTotal: z.number().optional(),
  summary: z.string().optional(),
});

export type BreakdownResult = z.infer<typeof BreakdownResultSchema>;

const TEMPLATES: { pattern: RegExp; build: (title: string) => BreakdownItem[] }[] = [
  {
    pattern: /leetcode|lc|算法|刷题/i,
    build: () => [
      { title: "选 1 道中等题（2min）", estimatedMin: 2, isEntryPoint: true },
      { title: "读题 + 写暴力思路", estimatedMin: 10 },
      { title: "实现并通过样例", estimatedMin: 25 },
      { title: "复盘最优解与复杂度", estimatedMin: 10 },
    ],
  },
  {
    pattern: /system design|sd|系统设计|mock/i,
    build: () => [
      { title: "列出需求与规模假设（2min）", estimatedMin: 2, isEntryPoint: true },
      { title: "画高层架构图", estimatedMin: 20 },
      { title: "深入 1 个核心组件", estimatedMin: 25 },
      { title: "口头 mock 15min 并记录 gap", estimatedMin: 20 },
    ],
  },
  {
    pattern: /deck|路演|投资人|presentation/i,
    build: (title) => [
      { title: "列出 3 个核心信息点（2min）", estimatedMin: 2, isEntryPoint: true },
      { title: "写大纲（问题-方案-牵引力）", estimatedMin: 30 },
      { title: "做 5 页关键 slide", estimatedMin: 60 },
      { title: `演练 ${title} 一遍并计时`, estimatedMin: 20 },
    ],
  },
  {
    pattern: /投资|理财|复盘|仓位|研报/i,
    build: () => [
      { title: "打开持仓表（2min）", estimatedMin: 2, isEntryPoint: true },
      { title: "记录本周市场变化", estimatedMin: 15 },
      { title: "检查仓位是否符合策略", estimatedMin: 20 },
      { title: "写下 1 条下周行动", estimatedMin: 10 },
    ],
  },
  {
    pattern: /面试|投递|内推|resume|简历/i,
    build: () => [
      { title: "更新目标公司清单（2min）", estimatedMin: 2, isEntryPoint: true },
      { title: "改一版简历 bullet", estimatedMin: 30 },
      { title: "写定制化 cover / 内推消息", estimatedMin: 20 },
      { title: "提交 1 个申请", estimatedMin: 15 },
    ],
  },
  {
    pattern: /design doc|rfc|跨团队|staff|影响力/i,
    build: () => [
      { title: "写 3 句问题陈述（2min）", estimatedMin: 2, isEntryPoint: true },
      { title: "列 stakeholders 并发异步对齐", estimatedMin: 30 },
      { title: "完成初版 design doc", estimatedMin: 90 },
      { title: "约 review 会议", estimatedMin: 15 },
    ],
  },
];

function genericBreakdown(title: string): BreakdownItem[] {
  return [
    { title: `明确「${title}」的完成标准（2min）`, estimatedMin: 2, isEntryPoint: true },
    { title: "收集所需材料 / 上下文", estimatedMin: 15 },
    { title: "完成核心执行步骤", estimatedMin: 45 },
    { title: "检查质量并收尾", estimatedMin: 15 },
  ];
}

function estimateIntimidation(title: string, itemCount: number): number {
  let score = 2;
  if (/deck|面试|design|staff|投资人|转型/.test(title)) score += 1;
  if (itemCount >= 5) score += 1;
  if (/准备|推动|证明|完成.*项目/.test(title)) score += 1;
  return Math.min(5, score);
}

export function ruleBasedBreakdown(
  title: string,
  description?: string | null,
): BreakdownResult {
  const text = `${title} ${description ?? ""}`;

  for (const tpl of TEMPLATES) {
    if (tpl.pattern.test(text)) {
      const subtasks = tpl.build(title);
      const estimatedMinTotal = subtasks.reduce(
        (s, t) => s + (t.estimatedMin ?? 0),
        0,
      );
      return {
        subtasks,
        intimidationScore: estimateIntimidation(title, subtasks.length),
        estimatedMinTotal,
        summary: `已按「${title}」类型模板拆解为 ${subtasks.length} 步，第一步 ≤2min 可立即启动。`,
      };
    }
  }

  const subtasks = genericBreakdown(title);
  const estimatedMinTotal = subtasks.reduce((s, t) => s + (t.estimatedMin ?? 0), 0);
  return {
    subtasks,
    intimidationScore: estimateIntimidation(title, subtasks.length),
    estimatedMinTotal,
    summary: `已将任务拆解为 ${subtasks.length} 步，第一步是 2 分钟入口动作。`,
  };
}

async function openAiBreakdown(
  title: string,
  description: string | null | undefined,
  context?: { northStar?: string; pillar?: string; userPrompt?: string },
): Promise<BreakdownResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const system = `你是任务拆解助手。将任务拆成 3-6 个可执行子步骤。
规则：
- 第一步必须是 ≤2 分钟可完成的入口动作，标记 isEntryPoint: true
- 若 userInstructions 有内容，优先遵循用户的补充说明与约束
- 用中文
- 只返回 JSON：{"subtasks":[{"title":"...","estimatedMin":10,"isEntryPoint":false}],"intimidationScore":1-5,"estimatedMinTotal":N,"summary":"一句话"}`;

  const user = JSON.stringify({
    title,
    description,
    northStar: context?.northStar,
    pillar: context?.pillar,
    userInstructions: context?.userPrompt?.trim() || undefined,
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = BreakdownResultSchema.parse(JSON.parse(content));
    if (!parsed.subtasks.some((s) => s.isEntryPoint)) {
      parsed.subtasks[0].isEntryPoint = true;
      parsed.subtasks[0].estimatedMin = Math.min(parsed.subtasks[0].estimatedMin ?? 2, 2);
    }
    return parsed;
  } catch {
    return null;
  }
}

function mergeDescription(
  description?: string | null,
  userPrompt?: string,
): string | null | undefined {
  const parts = [description?.trim(), userPrompt?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : description;
}

export async function generateBreakdown(
  title: string,
  description?: string | null,
  context?: { northStar?: string; pillar?: string; userPrompt?: string },
): Promise<BreakdownResult & { source: "openai" | "rules" }> {
  const ai = await openAiBreakdown(title, description, context);
  if (ai) return { ...ai, source: "openai" };

  const rules = ruleBasedBreakdown(
    title,
    mergeDescription(description, context?.userPrompt),
  );
  return { ...rules, source: "rules" };
}

export function shouldAutoBreakdown(title: string, intimidationScore?: number): boolean {
  if ((intimidationScore ?? 0) >= 4) return true;
  return /准备|deck|面试|设计|推动|完成|项目|转型|投资|探索|leetcode|lc/i.test(title);
}
