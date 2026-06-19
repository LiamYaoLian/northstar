"use client";

import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { TimerProvider } from "@/components/timer-provider";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TimerProvider>
      <AppHeader />
      {children}
    </TimerProvider>
  );
}
