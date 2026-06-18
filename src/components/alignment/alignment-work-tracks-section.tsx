import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { translateFocusTrack } from "@/lib/i18n/entities";
import type { FocusTrackAlignment } from "@/lib/alignment";

type AlignmentWorkTracksSectionProps = {
  workTracks: FocusTrackAlignment[];
};

export function AlignmentWorkTracksSection({
  workTracks,
}: AlignmentWorkTracksSectionProps) {
  const { locale, t } = useLocale();

  if (workTracks.length === 0) {
    return null;
  }

  return (
    <Card className="space-y-3">
      <h3 className="font-medium">{t.alignment.workSubTracks}</h3>
      {workTracks.map((track) => (
        <div key={track.name} className="flex justify-between text-sm">
          <span>{translateFocusTrack(track.name, locale)}</span>
          <span className="text-muted">
            {t.common.target} {track.targetShare}% · {t.common.actual}{" "}
            {track.actualShare}%
            {track.drift !== 0 && (
              <span
                className={track.drift < 0 ? " text-amber-600" : " text-blue-600"}
              >
                {" "}
                ({track.drift > 0 ? "+" : ""}
                {track.drift}%)
              </span>
            )}
          </span>
        </div>
      ))}
    </Card>
  );
}
