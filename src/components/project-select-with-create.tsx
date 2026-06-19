"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useLocale } from "@/lib/i18n/context";
import {
  toProjectOptions,
  type ProjectOption,
} from "@/lib/tasks/enrich-tasks";
import { cn } from "@/lib/utils";
import { CATEGORY_SELECT_CLASS } from "@/components/task-card/utils";

const CREATE_PROJECT_VALUE = "__create__";

type ProjectSelectWithCreateProps = {
  value: string;
  projects: ProjectOption[];
  workPillarId: string;
  onChange: (projectId: string | null) => void;
  onProjectCreated: (project: ProjectOption) => void;
  onError?: (message: string) => void;
  selectClassName?: string;
  inline?: boolean;
};

export function ProjectSelectWithCreate({
  value,
  projects,
  workPillarId,
  onChange,
  onProjectCreated,
  onError,
  selectClassName,
  inline = false,
}: ProjectSelectWithCreateProps) {
  const { t } = useLocale();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const data = await apiFetch<{
        project: {
          id: string;
          name: string;
          pillarId: string;
          focusTrack: string | null;
        };
      }>("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pillarId: workPillarId }),
      });
      const option = toProjectOptions([data.project])[0];
      onProjectCreated(option);
      onChange(data.project.id);
      setCreating(false);
      setNewName("");
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : t.errors.createProjectFailed,
      );
    } finally {
      setSaving(false);
    }
  }

  const selectClass = cn(
    inline ? CATEGORY_SELECT_CLASS : "rounded-md border border-border px-3 py-2 text-sm",
    selectClassName,
  );

  return (
    <>
      <label className={inline ? "flex items-center gap-1" : undefined}>
        <span className="sr-only">{t.projects.project}</span>
        <select
          className={selectClass}
          value={creating ? CREATE_PROJECT_VALUE : value}
          onChange={(e) => {
            const next = e.target.value;
            if (next === CREATE_PROJECT_VALUE) {
              setCreating(true);
              onChange(null);
              return;
            }
            setCreating(false);
            setNewName("");
            onChange(next || null);
          }}
        >
          <option value="">{t.projects.noProject}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
          <option value={CREATE_PROJECT_VALUE}>{t.projects.createProject}</option>
        </select>
      </label>
      {creating && (
        <div className="flex flex-wrap gap-2">
          <input
            className={cn(
              inline
                ? "rounded-full border bg-white px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-accent"
                : "rounded-md border border-border px-3 py-2 text-sm",
            )}
            placeholder={t.projects.newProjectName}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
          />
          <button
            type="button"
            disabled={!newName.trim() || saving}
            onClick={() => void handleCreate()}
            className={cn(
              "rounded-md border border-border hover:bg-neutral-50 disabled:opacity-50",
              inline ? "px-2 py-0.5 text-xs" : "px-3 py-2 text-sm",
            )}
          >
            {t.common.add}
          </button>
        </div>
      )}
    </>
  );
}
