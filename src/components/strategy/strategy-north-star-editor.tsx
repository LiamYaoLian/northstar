"use client";

import { useLocale } from "@/lib/i18n/context";
import { translateWorkTrackKey } from "@/lib/i18n/entities";
import { WORK_TRACK_PRESETS } from "@/lib/strategy/templates";
import type { StrategyEditorFields } from "@/lib/strategy/view-types";

type StrategyNorthStarEditorProps = {
  fields: StrategyEditorFields;
  onChange: (fields: StrategyEditorFields) => void;
};

export function StrategyNorthStarEditor({
  fields,
  onChange,
}: StrategyNorthStarEditorProps) {
  const { locale, t } = useLocale();

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs text-muted">{t.strategy.horizonLabel}</span>
        <input
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
          value={fields.horizon}
          onChange={(e) => onChange({ ...fields, horizon: e.target.value })}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted">{t.strategy.northStar}</span>
        <textarea
          className="min-h-24 w-full rounded-md border border-border px-3 py-2 text-sm"
          value={fields.statement}
          onChange={(e) => onChange({ ...fields, statement: e.target.value })}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted">{t.strategy.hoursPerWeekLabel}</span>
        <input
          type="number"
          min={1}
          max={168}
          className="w-32 rounded-md border border-border px-3 py-2 text-sm"
          value={fields.hoursPerWeek}
          onChange={(e) =>
            onChange({ ...fields, hoursPerWeek: Number(e.target.value) })
          }
        />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-xs text-muted">{t.strategy.workPrimaryTrack}</legend>
        {Object.keys(WORK_TRACK_PRESETS).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="workTrack"
              checked={fields.workTrack === key}
              onChange={() => onChange({ ...fields, workTrack: key })}
            />
            {translateWorkTrackKey(key, locale)}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
