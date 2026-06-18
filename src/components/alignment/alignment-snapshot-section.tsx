import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { localeTag } from "@/lib/i18n/entities";

type SnapshotRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  alignmentScore: number;
  driftScore: number;
  createdAt: string;
};

type AlignmentSnapshotSectionProps = {
  history: SnapshotRow[];
  savedAt: string | null;
};

export function AlignmentSnapshotSection({
  history,
  savedAt,
}: AlignmentSnapshotSectionProps) {
  const { locale, t } = useLocale();

  return (
    <section id="snapshots" className="scroll-mt-6 space-y-3">
      <div>
        <h3 className="text-lg font-semibold">{t.review.history}</h3>
        <p className="text-sm text-muted">{t.review.subtitle}</p>
      </div>

      {savedAt && (
        <p className="text-xs text-muted">
          {t.review.snapshotSavedAt.replace(
            "{time}",
            new Date(savedAt).toLocaleString(localeTag(locale)),
          )}
        </p>
      )}

      <Card className="space-y-3">
        {history.length === 0 ? (
          <p className="text-sm text-muted">{t.review.noHistory}</p>
        ) : (
          history.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0 last:pb-0"
            >
              <span>
                {row.periodStart} – {row.periodEnd}
              </span>
              <span className="text-muted">
                {t.review.alignmentScore} {row.alignmentScore} · {t.review.driftScore}{" "}
                {row.driftScore}
              </span>
            </div>
          ))
        )}
      </Card>
    </section>
  );
}
