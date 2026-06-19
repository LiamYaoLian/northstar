"use client";

import { useLocale } from "@/lib/i18n/context";
import type { ProjectOption } from "@/lib/tasks/enrich-tasks";
import { cn } from "@/lib/utils";

type ProjectFilterProps = {
  projects: ProjectOption[];
  selectedProjectId: string | null;
  onChange: (projectId: string | null) => void;
};

export function ProjectFilter({
  projects,
  selectedProjectId,
  onChange,
}: ProjectFilterProps) {
  const { t } = useLocale();

  if (projects.length === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={t.projects.filterByProject}
    >
      <ProjectFilterButton
        active={selectedProjectId === null}
        onClick={() => onChange(null)}
      >
        {t.projects.allProjects}
      </ProjectFilterButton>
      {projects.map((project) => (
        <ProjectFilterButton
          key={project.id}
          active={selectedProjectId === project.id}
          onClick={() => onChange(project.id)}
        >
          {project.name}
        </ProjectFilterButton>
      ))}
    </div>
  );
}

function ProjectFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-accent bg-accent text-white"
          : "border-border bg-white text-foreground hover:bg-neutral-50",
      )}
    >
      {children}
    </button>
  );
}
