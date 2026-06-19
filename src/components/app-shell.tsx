"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { TimerProvider } from "@/components/timer-provider";
import { cn } from "@/lib/utils";

function isWideLayoutPath(pathname: string): boolean {
  return pathname === "/calendar" || pathname.startsWith("/calendar/");
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const wideLayout = isWideLayoutPath(pathname);

  return (
    <TimerProvider>
      <div
        className={cn(
          "mx-auto w-full px-4 py-6",
          wideLayout ? "max-w-[min(100%,90rem)]" : "max-w-3xl",
        )}
      >
        <AppHeader />
        {children}
      </div>
    </TimerProvider>
  );
}
