"use client";

import { AppNav } from "@/components/app-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/lib/i18n/context";

export function AppHeader() {
  const { t } = useLocale();

  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Northstar</h1>
        <p className="text-sm text-muted">{t.header.tagline}</p>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <AppNav />
      </div>
    </header>
  );
}
