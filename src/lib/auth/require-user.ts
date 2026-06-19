import "server-only";

import { auth } from "@/auth";
import { UnauthorizedError } from "@/lib/auth/errors";

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireUser(): Promise<{ id: string; email?: string | null }> {
  // Brief retry: parallel API calls after login/reset can race SQLite session reads.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const session = await auth();
    const id = session?.user?.id;
    if (id) {
      return { id, email: session.user?.email };
    }
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new UnauthorizedError();
}
