import type { PillarAlignment } from "@/lib/alignment";

export function PillarBar({ pillar }: { pillar: PillarAlignment }) {
  const max = Math.max(pillar.targetPct, pillar.actualPct, 1);
  const targetWidth = (pillar.targetPct / max) * 100;
  const actualWidth = (pillar.actualPct / max) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{pillar.name}</span>
        <span className="text-muted">
          目标 {pillar.targetPct}% · 实际 {pillar.actualPct}%
          {pillar.drift !== 0 && (
            <span
              className={
                pillar.drift < 0 ? "ml-1 text-amber-600" : "ml-1 text-blue-600"
              }
            >
              {pillar.drift > 0 ? "+" : ""}
              {pillar.drift}%
            </span>
          )}
          {pillar.alert === "over_cap" && (
            <span className="ml-1 text-red-600">超 cap</span>
          )}
          {pillar.alert === "under_floor" && (
            <span className="ml-1 text-red-600">低于 floor</span>
          )}
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="absolute inset-y-0 left-0 rounded-full opacity-30"
          style={{ width: `${targetWidth}%`, backgroundColor: pillar.color }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${actualWidth}%`, backgroundColor: pillar.color }}
        />
      </div>
    </div>
  );
}
