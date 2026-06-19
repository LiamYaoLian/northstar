"use client";

import { signOut, useSession } from "next-auth/react";

export function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="text-xs text-muted">Checking session...</span>;
  }

  if (!session?.user) {
    return (
      <a className="rounded-md border border-border px-3 py-1.5 text-sm" href="/login">
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="max-w-36 truncate text-muted">
        {session.user.email ?? session.user.name ?? "Signed in"}
      </span>
      <button
        className="rounded-md border border-border px-3 py-1.5"
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Sign out
      </button>
    </div>
  );
}
