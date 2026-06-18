import { Card } from "@/components/ui/card";
import { PillarBar } from "@/components/pillar-bar";
import { useLocale } from "@/lib/i18n/context";
import type { PillarAlignment } from "@/lib/alignment";

type AlignmentPillarSectionProps = {
  pillars: PillarAlignment[];
};

export function AlignmentPillarSection({ pillars }: AlignmentPillarSectionProps) {
  const { t } = useLocale();

  return (
    <Card className="space-y-4">
      <h3 className="font-medium">{t.alignment.pillarDrift}</h3>
      {pillars.map((pillar) => (
        <PillarBar key={pillar.pillarId} pillar={pillar} />
      ))}
    </Card>
  );
}
