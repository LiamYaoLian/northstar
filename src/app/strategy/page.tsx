"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import {
  translateFocusTrack,
  translatePillar,
  translatePillarDescription,
  translateWorkTrackKey,
} from "@/lib/i18n/entities";
import { WORK_TRACK_PRESETS } from "@/lib/strategy/templates";
import { workTrackKeyFromPrimaryTrack } from "@/lib/strategy/work-track";
import { parseJson } from "@/lib/utils";
import type { FocusTrack } from "@/lib/db/schema";

type Pillar = {
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

type Strategy = {
  northStar: {
    statement: string;
    horizon: string;
    hoursPerWeek: number;
    workPrimaryTrack: string | null;
  };
  pillars: Pillar[];
};

export default function StrategyPage() {
  const { locale, t } = useLocale();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statement, setStatement] = useState("");
  const [horizon, setHorizon] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState(40);
  const [workTrack, setWorkTrack] = useState("big_tech");

  const load = useCallback(async () => {
    const res = await fetch("/api/strategy");
    const data = await res.json();
    if (data.strategy) {
      setStrategy(data.strategy);
      setStatement(data.strategy.northStar.statement);
      setHorizon(data.strategy.northStar.horizon);
      setHoursPerWeek(data.strategy.northStar.hoursPerWeek);
      setWorkTrack(
        workTrackKeyFromPrimaryTrack(data.strategy.northStar.workPrimaryTrack),
      );
    } else {
      setStrategy(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit() {
    if (!strategy) return;
    setStatement(strategy.northStar.statement);
    setHorizon(strategy.northStar.horizon);
    setHoursPerWeek(strategy.northStar.hoursPerWeek);
    setWorkTrack(workTrackKeyFromPrimaryTrack(strategy.northStar.workPrimaryTrack));
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    if (!strategy) return;
    setStatement(strategy.northStar.statement);
    setHorizon(strategy.northStar.horizon);
    setHoursPerWeek(strategy.northStar.hoursPerWeek);
    setWorkTrack(workTrackKeyFromPrimaryTrack(strategy.northStar.workPrimaryTrack));
    setError(null);
    setEditing(false);
  }

  async function saveEdit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/strategy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statement,
          horizon,
          hoursPerWeek,
          workTrack,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? t.strategy.saveFailed);
      }
      setStrategy(data.strategy);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.strategy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

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
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted">{t.strategy.horizonLabel}</span>
              <input
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">{t.strategy.northStar}</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-border px-3 py-2 text-sm"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">{t.strategy.hoursPerWeekLabel}</span>
              <input
                type="number"
                min={1}
                max={168}
                className="w-32 rounded-md border border-border px-3 py-2 text-sm"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-xs text-muted">{t.strategy.workPrimaryTrack}</legend>
              {Object.entries(WORK_TRACK_PRESETS).map(([key]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="workTrack"
                    checked={workTrack === key}
                    onChange={() => setWorkTrack(key)}
                  />
                  {translateWorkTrackKey(key, locale)}
                </label>
              ))}
            </fieldset>
          </div>
        ) : (
          <>
            <p>{northStar.statement}</p>
            <p className="text-xs text-muted">
              {northStar.hoursPerWeek}h {t.strategy.hoursPerWeek}
              {northStar.workPrimaryTrack &&
                ` · ${t.strategy.workPrimaryTrack}：${translateFocusTrack(northStar.workPrimaryTrack, locale)}`}
            </p>
          </>
        )}
      </Card>

      <div className="space-y-3">
        {pillars.map((p) => {
          const tracks = parseJson<FocusTrack[]>(p.focusTracks, []);
          return (
            <Card key={p.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-medium">
                    {translatePillar(p.name, locale)}
                  </span>
                </div>
                <span className="text-sm text-muted">{p.targetPct}%</span>
              </div>
              {p.description && (
                <p className="text-sm text-muted">
                  {translatePillarDescription(p.name, p.description, locale)}
                </p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                {p.isHardConstraint && (
                  <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">
                    {t.common.floor}{" "}
                    {p.floorMinPerWeek
                      ? `${p.floorMinPerWeek}${t.common.perWeek}`
                      : ""}
                  </span>
                )}
                {p.capMaxPct && (
                  <span className="rounded bg-red-50 px-2 py-0.5 text-red-700">
                    {t.common.cap} {p.capMaxPct}%
                  </span>
                )}
              </div>
              {tracks.length > 0 && (
                <div className="text-xs text-muted">
                  {t.common.subTracks}：
                  {tracks
                    .map(
                      (tr) =>
                        `${translateFocusTrack(tr.name, locale)} ${tr.shareOfParent}%`,
                    )
                    .join(" · ")}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Link href="/onboarding" className="inline-block text-sm text-accent">
        {t.strategy.resetStrategy}
      </Link>
    </div>
  );
}
