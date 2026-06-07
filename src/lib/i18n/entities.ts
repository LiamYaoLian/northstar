import type { Locale } from "./types";

const PILLARS: Record<string, { zh: string; en: string }> = {
  工作: { zh: "工作", en: "Work" },
  健康: { zh: "健康", en: "Health" },
  关系: { zh: "关系", en: "Relationships" },
  娱乐: { zh: "娱乐", en: "Fun" },
  琐事: { zh: "琐事", en: "Chores" },
  缓冲: { zh: "缓冲", en: "Buffer" },
};

const PILLAR_DESCRIPTIONS: Record<string, { zh: string; en: string }> = {
  工作: { zh: "职业发展与深度工作", en: "Career growth & deep work" },
  健康: { zh: "锻炼、睡眠、体能", en: "Exercise, sleep, fitness" },
  关系: { zh: "伴侣、家人、朋友", en: "Partner, family, friends" },
  娱乐: { zh: "放松与爱好", en: "Relaxation & hobbies" },
  琐事: { zh: "家务、行政、通勤", en: "Chores, admin, commute" },
  缓冲: { zh: "未归类与机动时间", en: "Unallocated & flex time" },
};

const FOCUS_TRACKS: Record<string, { zh: string; en: string }> = {
  进大厂: { zh: "进大厂", en: "Big Tech" },
  探索方向: { zh: "探索方向", en: "Explore" },
  投资: { zh: "投资", en: "Investing" },
};

const WORK_TRACK_KEYS: Record<string, { zh: string; en: string }> = {
  big_tech: { zh: "进大厂为主", en: "Big Tech focus" },
  explore: { zh: "探索方向为主", en: "Explore focus" },
  invest: { zh: "投资为主", en: "Investing focus" },
  balanced: { zh: "均衡（三线并行）", en: "Balanced (all three)" },
};

const CRITIQUE: Record<string, { zh: string; en: string }> = {
  WORK_MULTI_TRACK: {
    zh: "检测到多个职业/work 子目标，建议选定本季度主赛道。",
    en: "Multiple career/work sub-goals detected — pick one primary track this quarter.",
  },
  DUAL_CAREER_PATH: {
    zh: "「大厂面试」与「内部晋升」所需时间结构不同，建议二选一为主路径。",
    en: "Big-tech interviews vs internal promotion need different time structures — pick one primary path.",
  },
  HEALTH_NAMED: {
    zh: "提到健康，建议在预算中给 Health 至少 10%。",
    en: "Health mentioned — allocate at least 10% of budget to Health.",
  },
  FAMILY_FLOOR_SUGGEST: {
    zh: "检测到家庭/健康张力，建议将关系、健康设为 floor 硬约束。",
    en: "Family/health tension detected — set Relationships & Health as floor constraints.",
  },
  NORTH_STAR_UNMEASURABLE: {
    zh: "目标描述偏模糊，North Star 建议包含可验证数字或截止结果。",
    en: "Goals sound vague — North Star should include verifiable numbers or deadlines.",
  },
};

const BUDGET_ROWS: Record<
  string,
  { name: { zh: string; en: string }; note: { zh: string; en: string } }
> = {
  工作: {
    name: { zh: "工作", en: "Work" },
    note: { zh: "进大厂 / 探索 / 投资", en: "Big Tech / Explore / Investing" },
  },
  健康: {
    name: { zh: "健康", en: "Health" },
    note: { zh: "floor 硬约束", en: "floor hard constraint" },
  },
  关系: {
    name: { zh: "关系", en: "Relationships" },
    note: { zh: "floor 硬约束", en: "floor hard constraint" },
  },
  娱乐: {
    name: { zh: "娱乐", en: "Fun" },
    note: { zh: "cap 12%", en: "cap 12%" },
  },
  琐事: {
    name: { zh: "琐事", en: "Chores" },
    note: { zh: "cap 12%", en: "cap 12%" },
  },
  缓冲: {
    name: { zh: "缓冲", en: "Buffer" },
    note: { zh: "未归类", en: "unallocated" },
  },
};

export function translatePillar(name: string, locale: Locale): string {
  return PILLARS[name]?.[locale] ?? name;
}

export function translatePillarDescription(
  name: string,
  description: string | null,
  locale: Locale,
): string | null {
  if (!description) return null;
  return PILLAR_DESCRIPTIONS[name]?.[locale] ?? description;
}

export function translateFocusTrack(name: string, locale: Locale): string {
  return FOCUS_TRACKS[name]?.[locale] ?? name;
}

export function translateWorkTrackKey(key: string, locale: Locale): string {
  return WORK_TRACK_KEYS[key]?.[locale] ?? key;
}

export function translateCritique(code: string, locale: Locale): string {
  return CRITIQUE[code]?.[locale] ?? code;
}

export function budgetRows(locale: Locale) {
  return Object.values(BUDGET_ROWS).map((row) => ({
    name: row.name[locale],
    note: row.note[locale],
  }));
}

const BUDGET_PCTS = ["40%", "15%", "15%", "10%", "10%", "10%"];

export function budgetTable(locale: Locale) {
  return budgetRows(locale).map((row, i) => ({
    ...row,
    pct: BUDGET_PCTS[i],
  }));
}

export function translateProcrastinationReason(
  reason: string,
  locale: Locale,
): string {
  if (locale === "zh") return reason;

  const created = reason.match(/创建 (\d+) 天，0 分钟记录/);
  if (created) return `Created ${created[1]} days ago, 0 min logged`;

  if (reason === "高恐吓任务，尚未开始")
    return "High intimidation, not started yet";

  const postponed = reason.match(/已推迟 (\d+) 次/);
  if (postponed) return `Postponed ${postponed[1]} times`;

  return reason;
}

export function localeTag(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en-US";
}
