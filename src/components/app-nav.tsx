"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/today", label: "Today" },
  { href: "/alignment", label: "Alignment" },
  { href: "/tasks", label: "Tasks" },
  { href: "/strategy", label: "Strategy" },
];

export function AppNav() {
  const pathname = usePathname();
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
