import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { translateProcrastinationReason } from "@/lib/i18n/entities";
import type { ProcrastinationSignal } from "@/lib/alignment";

type AlignmentProcrastinationSectionProps = {
  signals: ProcrastinationSignal[];
};

export function AlignmentProcrastinationSection({
  signals,
}: AlignmentProcrastinationSectionProps) {
  const { locale, t } = useLocale();

  if (signals.length === 0) {
    return null;
  }

  return (
    <Card className="space-y-3">
      <h3 className="font-medium">{t.alignment.procrastinationRadar}</h3>
      {signals.map((signal) => (
        <div key={signal.taskId} className="text-sm">
          <span className="font-medium">{signal.title}</span>
          <span className="text-muted">
            {" "}
            — {translateProcrastinationReason(signal.reason, locale)}
          </span>
        </div>
      ))}
    </Card>
  );
}
