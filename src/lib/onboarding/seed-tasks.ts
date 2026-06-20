export const ONBOARDING_SEED_TASKS = [
  { title: "LeetCode 本周 3 题", focusTrack: "进大厂" },
  { title: "周日投资复盘 1h", focusTrack: "投资" },
  { title: "晨跑 30min", pillarName: "健康" },
  { title: "周三家庭晚餐", pillarName: "关系" },
] as const;

export type OnboardingSeedTask = (typeof ONBOARDING_SEED_TASKS)[number];
