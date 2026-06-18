"use client";

import { useLocale } from "@/lib/i18n/context";
import { translatePillar } from "@/lib/i18n/entities";
import type { PillarOption } from "@/lib/tasks/enrich-tasks";
import { cn } from "@/lib/utils";

type CategoryFilterProps = {
  pillars: PillarOption[];
  selectedPillarId: string | null;
  onChange: (pillarId: string | null) => void;
};

export function CategoryFilter({
  pillars,
  selectedPillarId,
  onChange,
}: CategoryFilterProps) {
  const { locale, t } = useLocale();

  if (pillars.length === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={t.common.filterByCategory}
    >
      <CategoryFilterButton
        active={selectedPillarId === null}
        onClick={() => onChange(null)}
      >
        {t.common.allCategories}
      </CategoryFilterButton>
      {pillars.map((pillar) => (
        <CategoryFilterButton
          key={pillar.id}
          active={selectedPillarId === pillar.id}
          onClick={() => onChange(pillar.id)}
          color={pillar.color}
        >
          {translatePillar(pillar.name, locale)}
        </CategoryFilterButton>
      ))}
    </div>
  );
}

function CategoryFilterButton({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? color
            ? "border-transparent text-white"
            : "border-accent bg-accent text-white"
          : "border-border bg-white text-foreground hover:bg-neutral-50",
      )}
      style={
        active && color
          ? { backgroundColor: color, borderColor: color }
          : !active && color
            ? { borderColor: color }
            : undefined
      }
    >
      {children}
    </button>
  );
}
