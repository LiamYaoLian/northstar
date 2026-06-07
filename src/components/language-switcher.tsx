"use client";

import { useLocale } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  const options: { id: Locale; label: string }[] = [
    { id: "zh", label: t.language.zh },
    { id: "en", label: t.language.en },
  ];

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5 text-xs"
      role="group"
      aria-label={t.language.label}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setLocale(opt.id)}
          className={cn(
            "rounded-md px-2 py-1 transition-colors",
            locale === opt.id
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
