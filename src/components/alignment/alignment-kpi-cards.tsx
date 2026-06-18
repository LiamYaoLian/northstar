import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

type AlignmentKpiCardsProps = {
  alignmentScore: number;
  driftScore: number;
  totalLoggedMin: number;
  totalCompletions: number;
};

export function AlignmentKpiCards({
  alignmentScore,
  driftScore,
  totalLoggedMin,
  totalCompletions,
}: AlignmentKpiCardsProps) {
  const { t } = useLocale();
  const loggedHours = Math.round((totalLoggedMin / 60) * 10) / 10;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <div className="text-2xl font-semibold">{alignmentScore}</div>
        <p className="text-sm text-muted">{t.review.alignmentScore}</p>
      </Card>
      <Card>
        <div className="text-2xl font-semibold">{driftScore}</div>
        <p className="text-sm text-muted">{t.review.driftScore}</p>
      </Card>
      <Card>
        <div className="text-2xl font-semibold">{loggedHours}h</div>
        <p className="text-sm text-muted">{t.review.loggedInPeriod}</p>
      </Card>
      <Card>
        <div className="text-2xl font-semibold">{totalCompletions}</div>
        <p className="text-sm text-muted">{t.review.completionsInPeriod}</p>
      </Card>
    </div>
  );
}
