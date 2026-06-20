export type StrategyPillar = {
  id: string;
  name: string;
  description: string | null;
  targetPct: number;
  color: string;
  keywords: string;
  focusTracks: string | null;
  floorMinPerWeek: number | null;
  capMaxPct: number | null;
  isHardConstraint: boolean;
};

export type StrategyView = {
  northStar: {
    statement: string;
    horizon: string;
    hoursPerWeek: number;
    workPrimaryTrack: string | null;
  };
  pillars: StrategyPillar[];
};

export type StrategyResponse = {
  hasStrategy?: boolean;
  strategy: StrategyView | null;
};

export type StrategyEditorFields = {
  statement: string;
  horizon: string;
  hoursPerWeek: number;
  workTrack: string;
};
