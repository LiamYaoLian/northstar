export type CritiqueFinding = {
  code: string;
  message: string;
  severity: "low" | "medium" | "high";
};

export type StrategyCritique = {
  findings: CritiqueFinding[];
  requiresWorkTrackChoice: boolean;
  requiresMeasurableNorthStar: boolean;
};

export function analyzeBrainDump(text: string): StrategyCritique {
  const findings: CritiqueFinding[] = [];
  const lower = text.toLowerCase();

  const hasBigTech =
    /大厂|faang|google|meta|amazon|面试|leetcode|lc|onsite/.test(lower);
  const hasStaff =
    /staff|晋升|影响力|跨团队|sponsor|架构 review/.test(lower);
  const hasExplore = /探索|方向|转型|创业|web3/.test(lower);
  const hasInvest = /投资|理财|炒股|仓位|研报/.test(lower);
  const hasHealth = /健康|锻炼|跑步|睡眠|健身/.test(lower);
  const hasFamily = /家庭|老婆|老公|带娃|陪伴|关系/.test(lower);

  const careerTracks = [hasBigTech, hasStaff, hasExplore, hasInvest].filter(
    Boolean,
  ).length;

  if (careerTracks >= 2) {
    findings.push({
      code: "WORK_MULTI_TRACK",
      message: "检测到多个职业/work 子目标，建议选定本季度主赛道。",
      severity: "high",
    });
  }

  if (hasBigTech && hasStaff) {
    findings.push({
      code: "DUAL_CAREER_PATH",
      message: "「大厂面试」与「内部晋升」所需时间结构不同，建议二选一为主路径。",
      severity: "high",
    });
  }

  if (hasHealth && !/停|没|缺/.test(lower)) {
    findings.push({
      code: "HEALTH_NAMED",
      message: "提到健康，建议在预算中给 Health 至少 10%。",
      severity: "medium",
    });
  }

  if (/停|没锻炼|加班/.test(lower) && hasFamily) {
    findings.push({
      code: "FAMILY_FLOOR_SUGGEST",
      message: "检测到家庭/健康张力，建议将关系、健康设为 floor 硬约束。",
      severity: "medium",
    });
  }

  if (/进展|努力|尽量|可能/.test(lower) && !/\d|家|次|h|小时|周/.test(lower)) {
    findings.push({
      code: "NORTH_STAR_UNMEASURABLE",
      message: "目标描述偏模糊，North Star 建议包含可验证数字或截止结果。",
      severity: "medium",
    });
  }

  return {
    findings,
    requiresWorkTrackChoice: careerTracks >= 2 || hasBigTech || hasExplore || hasInvest,
    requiresMeasurableNorthStar: findings.some(
      (f) => f.code === "NORTH_STAR_UNMEASURABLE",
    ),
  };
}
