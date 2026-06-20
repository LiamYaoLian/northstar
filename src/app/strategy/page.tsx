"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StrategyNorthStarDisplay } from "@/components/strategy/strategy-north-star-display";
import { StrategyNorthStarEditor } from "@/components/strategy/strategy-north-star-editor";
import { StrategyPillarList } from "@/components/strategy/strategy-pillar-list";
import { useStrategyEditor } from "@/lib/hooks/use-strategy-editor";
import { useLocale } from "@/lib/i18n/context";

export default function StrategyPage() {
  const { t } = useLocale();
  const {
    strategy,
    editing,
    saving,
    error,
    fields,
    setFields,
    startEdit,
    cancelEdit,
    saveEdit,
  } = useStrategyEditor(t.strategy.saveFailed);

  if (!strategy) {
    return (
      <p className="text-sm text-muted">
        {t.strategy.notDefined}{" "}
        <Link href="/onboarding" className="text-accent">
          {t.strategy.startOnboarding}
        </Link>
      </p>
    );
  }

  const { northStar, pillars } = strategy;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{t.strategy.title}</h2>
          {!editing && <p className="text-sm text-muted">{northStar.horizon}</p>}
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={startEdit}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            {t.strategy.edit}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEdit()}
              className="rounded-md bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {saving ? t.strategy.saving : t.strategy.save}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={cancelEdit}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-neutral-50"
            >
              {t.strategy.cancel}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card className="space-y-3">
        <h3 className="text-sm font-medium text-muted">{t.strategy.northStar}</h3>
        {editing ? (
          <StrategyNorthStarEditor fields={fields} onChange={setFields} />
        ) : (
          <StrategyNorthStarDisplay strategy={strategy} />
        )}
      </Card>

      <StrategyPillarList pillars={pillars} />

      <Link href="/onboarding" className="inline-block text-sm text-accent">
        {t.strategy.resetStrategy}
      </Link>
    </div>
  );
}
