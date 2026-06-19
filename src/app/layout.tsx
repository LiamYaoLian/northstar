import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { LocaleProvider } from "@/lib/i18n/context";

export const metadata: Metadata = {
  title: "Northstar",
  description: "AI-driven todo with strategic alignment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AuthSessionProvider>
          <LocaleProvider>
            <div className="mx-auto max-w-3xl px-4 py-6">
              <AppShell>{children}</AppShell>
            </div>
          </LocaleProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
