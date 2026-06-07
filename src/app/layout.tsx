import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "@/components/app-nav";

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
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Northstar</h1>
              <p className="text-sm text-muted">战略对齐 · 自动优先级</p>
            </div>
            <AppNav />
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
