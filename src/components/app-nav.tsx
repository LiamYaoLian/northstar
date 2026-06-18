"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function AppNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const links = [
    { href: "/today", label: t.nav.today },
    { href: "/alignment", label: t.nav.alignment },
    { href: "/tasks", label: t.nav.tasks },
    { href: "/completed", label: t.nav.completed },
    { href: "/strategy", label: t.nav.strategy },
  ];

  return (
    <nav className="flex gap-1 rounded-lg border border-border bg-card p-1 text-sm">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-md px-3 py-1.5 transition-colors",
            pathname === link.href || pathname.startsWith(link.href + "/")
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
