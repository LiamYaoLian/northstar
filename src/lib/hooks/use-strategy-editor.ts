"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type {
  StrategyEditorFields,
  StrategyResponse,
  StrategyView,
} from "@/lib/strategy/view-types";
import { workTrackKeyFromPrimaryTrack } from "@/lib/strategy/work-track";

function fieldsFromStrategy(strategy: StrategyView): StrategyEditorFields {
  return {
    statement: strategy.northStar.statement,
    horizon: strategy.northStar.horizon,
    hoursPerWeek: strategy.northStar.hoursPerWeek,
    workTrack: workTrackKeyFromPrimaryTrack(strategy.northStar.workPrimaryTrack),
  };
}

export function useStrategyEditor(saveFailedMessage: string) {
  const [strategy, setStrategy] = useState<StrategyView | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<StrategyEditorFields>({
    statement: "",
    horizon: "",
    hoursPerWeek: 40,
    workTrack: "big_tech",
  });

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<StrategyResponse>("/api/strategy");
      if (data.strategy) {
        setStrategy(data.strategy);
        setFields(fieldsFromStrategy(data.strategy));
      } else {
        setStrategy(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : saveFailedMessage);
    }
  }, [saveFailedMessage]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit() {
    if (!strategy) return;
    setFields(fieldsFromStrategy(strategy));
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    if (!strategy) return;
    setFields(fieldsFromStrategy(strategy));
    setError(null);
    setEditing(false);
  }

  async function saveEdit() {
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<StrategyResponse>("/api/strategy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!data.strategy) {
        throw new Error(saveFailedMessage);
      }
      setStrategy(data.strategy);
      setFields(fieldsFromStrategy(data.strategy));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : saveFailedMessage);
    } finally {
      setSaving(false);
    }
  }

  return {
    strategy,
    editing,
    saving,
    error,
    fields,
    setFields,
    startEdit,
    cancelEdit,
    saveEdit,
  };
}
