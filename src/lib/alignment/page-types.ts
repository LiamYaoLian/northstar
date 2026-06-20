import type {
  AlignmentResult,
  FocusTrackAlignment,
  ProcrastinationSignal,
} from "@/lib/alignment";
import type { ReviewPeriod } from "@/lib/review/period";

export type ReviewSnapshotView = {
  id: string;
  periodStart: string;
  periodEnd: string;
  alignmentScore: number;
  driftScore: number;
  createdAt: string;
};

export type ReviewDashboard = {
  saved: ReviewSnapshotView | null;
  history: ReviewSnapshotView[];
};

export type AlignmentApiResponse = {
  alignment: AlignmentResult | null;
  workTracks: FocusTrackAlignment[];
  procrastination: ProcrastinationSignal[];
  periodStart: string;
  periodEnd: string;
  driftScore: number;
};

export type StrategyPillarsResponse = {
  strategy: {
    pillars: {
      id: string;
      name: string;
      color: string;
      focusTracks: string | null;
    }[];
  } | null;
};

export type SaveReviewPayload = {
  period: ReviewPeriod;
};
