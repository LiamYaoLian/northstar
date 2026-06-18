import { z } from "zod";

export const BreakdownItemSchema = z.object({
  title: z.string(),
  estimatedMin: z.number().optional(),
  isEntryPoint: z.boolean().optional(),
});

export type BreakdownItem = z.infer<typeof BreakdownItemSchema>;

export const MAX_BREAKDOWN_SUBTASKS = 20;

export const AMAZON_LEADERSHIP_PRINCIPLES = [
  "Customer Obsession",
  "Ownership",
  "Invent and Simplify",
  "Are Right, A Lot",
  "Learn and Be Curious",
  "Hire and Develop the Best",
  "Insist on the Highest Standards",
  "Think Big",
  "Bias for Action",
  "Frugality",
  "Earn Trust",
  "Dive Deep",
  "Have Backbone; Disagree and Commit",
  "Deliver Results",
  "Strive to be Earth's Best Employer",
  "Success and Scale Bring Broad Responsibility",
] as const;

export const BreakdownResultSchema = z.object({
  subtasks: z.array(BreakdownItemSchema).min(2).max(MAX_BREAKDOWN_SUBTASKS),
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

export function amazonPrinciplesBreakdown(title: string): BreakdownResult {
  const subtasks = AMAZON_LEADERSHIP_PRINCIPLES.map((principle, i) => ({
    title: principle,
    estimatedMin: 30,
    isEntryPoint: i === 0,
  }));
  const estimatedMinTotal = subtasks.reduce((s, t) => s + (t.estimatedMin ?? 0), 0);
  return {
    subtasks: [...subtasks],
    intimidationScore: estimateIntimidation(title, subtasks.length),
    estimatedMinTotal,
    summary: `已按 Amazon 16 条 Leadership Principles 生成 ${subtasks.length} 个子任务。`,
  };
}

function wantsAmazonPrinciples(text: string): boolean {
  return (
    /amazon|亚马逊/i.test(text) &&
    /(?:16|十六).{0,12}(?:principle|原则|领导力)|leadership\s*principles?/i.test(text)
  );
}

export function promptDrivenBreakdown(
  userPrompt: string,
  title: string,
): BreakdownResult | null {
  const prompt = userPrompt.trim();
  if (!prompt) return null;

  if (wantsAmazonPrinciples(prompt)) {
    return amazonPrinciplesBreakdown(title);
  }

  return null;
}

export class BreakdownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BreakdownError";
  }
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

  const system = `你是任务拆解助手。将任务拆成可执行的子步骤。

优先级（必须遵守）：
1. 若 userInstructions 有内容，严格按用户指令生成——包括子任务数量、命名、结构。禁止套用「明确完成标准 / 收集材料 / 核心步骤 / 收尾」等通用模板。
2. 若用户要求「每个 X 一个子任务」、列出 N 项、或给出枚举/清单，逐项生成对应子任务（2-${MAX_BREAKDOWN_SUBTASKS} 步均可）。
3. 仅当用户没有特殊要求时，才拆成 3-6 步，且第一步是 ≤2 分钟的入口动作（isEntryPoint: true）。
4. 子任务标题用中文；专有名词（如 Amazon Leadership Principles 名称）可保留英文。
5. 只返回 JSON：{"subtasks":[{"title":"...","estimatedMin":10,"isEntryPoint":false}],"intimidationScore":1-5,"estimatedMinTotal":N,"summary":"一句话"}`;

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

export async function generateBreakdown(
  title: string,
  description?: string | null,
  context?: { northStar?: string; pillar?: string; userPrompt?: string },
): Promise<BreakdownResult & { source: "openai" | "rules" }> {
  const userPrompt = context?.userPrompt?.trim() ?? "";

  const ai = await openAiBreakdown(title, description, context);
  if (ai) return { ...ai, source: "openai" };

  if (userPrompt) {
    const fromPrompt = promptDrivenBreakdown(userPrompt, title);
    if (fromPrompt) return { ...fromPrompt, source: "rules" };

    if (!process.env.OPENAI_API_KEY) {
      throw new BreakdownError(
        "未配置 OPENAI_API_KEY，无法理解自定义拆解指令。请在 .env.local 中设置 API Key，或使用更明确的指令（如 Amazon 16 principles）。",
      );
    }
    throw new BreakdownError(
      "AI 未能理解你的拆解指令，请换一种描述后重试。",
    );
  }

  return { ...ruleBasedBreakdown(title, description), source: "rules" };
}

export function shouldAutoBreakdown(title: string, intimidationScore?: number): boolean {
  if ((intimidationScore ?? 0) >= 4) return true;
  return /准备|deck|面试|设计|推动|完成|项目|转型|投资|探索|leetcode|lc/i.test(title);
}
