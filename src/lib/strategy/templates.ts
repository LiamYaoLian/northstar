import type { FocusTrack } from "@/lib/db/schema";

export type PillarTemplate = {
  name: string;
  description: string;
  targetPct: number;
  color: string;
  keywords: string[];
  focusTracks?: FocusTrack[];
  floorMinPerWeek?: number;
  capMaxPct?: number;
  isHardConstraint?: boolean;
};

export type StrategyTemplate = {
  id: string;
  label: string;
  northStar: string;
  horizon: string;
  pillars: PillarTemplate[];
};

export const LIFE_BALANCE_TEMPLATE: StrategyTemplate = {
  id: "life_balance",
  label: "生活平衡型",
  northStar:
    "本季度在保持健康、关系的前提下，在工作主赛道上取得可验证进展。",
  horizon: "2026 Q2",
  pillars: [
    {
      name: "工作",
      description: "职业发展与深度工作",
      targetPct: 40,
      color: "#3b82f6",
      keywords: ["面试", "leetcode", "投资", "调研", "项目", "代码"],
      focusTracks: [
        { name: "进大厂", shareOfParent: 50 },
        { name: "探索方向", shareOfParent: 30 },
        { name: "投资", shareOfParent: 20 },
      ],
    },
    {
      name: "健康",
      description: "锻炼、睡眠、体能",
      targetPct: 15,
      color: "#22c55e",
      keywords: ["锻炼", "跑步", "睡眠", "冥想", "体检"],
      floorMinPerWeek: 300,
      isHardConstraint: true,
    },
    {
      name: "关系",
      description: "伴侣、家人、朋友",
      targetPct: 15,
      color: "#ec4899",
      keywords: ["家庭", "陪伴", "晚餐", "约会", "朋友"],
      floorMinPerWeek: 600,
      isHardConstraint: true,
    },
    {
      name: "娱乐",
      description: "放松与爱好",
      targetPct: 10,
      color: "#a855f7",
      keywords: ["游戏", "追剧", "电影", "爱好"],
      capMaxPct: 12,
    },
    {
      name: "琐事",
      description: "家务、行政、通勤",
      targetPct: 10,
      color: "#6b7280",
      keywords: ["家务", "账单", "快递", "预约", "通勤"],
      capMaxPct: 12,
    },
    {
      name: "缓冲",
      description: "未归类与机动时间",
      targetPct: 10,
      color: "#d1d5db",
      keywords: [],
    },
  ],
};

export const WORK_TRACK_PRESETS: Record<
  string,
  { label: string; focusTracks: FocusTrack[] }
> = {
  big_tech: {
    label: "进大厂为主",
    focusTracks: [
      { name: "进大厂", shareOfParent: 60 },
      { name: "探索方向", shareOfParent: 25 },
      { name: "投资", shareOfParent: 15 },
    ],
  },
  explore: {
    label: "探索方向为主",
    focusTracks: [
      { name: "进大厂", shareOfParent: 15 },
      { name: "探索方向", shareOfParent: 55 },
      { name: "投资", shareOfParent: 30 },
    ],
  },
  invest: {
    label: "投资为主",
    focusTracks: [
      { name: "进大厂", shareOfParent: 10 },
      { name: "探索方向", shareOfParent: 20 },
      { name: "投资", shareOfParent: 70 },
    ],
  },
  balanced: {
    label: "均衡（三线并行）",
    focusTracks: [
      { name: "进大厂", shareOfParent: 50 },
      { name: "探索方向", shareOfParent: 30 },
      { name: "投资", shareOfParent: 20 },
    ],
  },
};

export const STRATEGY_TEMPLATES = [LIFE_BALANCE_TEMPLATE];
