import "server-only";

import { auth } from "@/auth";
import { UnauthorizedError } from "@/lib/auth/errors";

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireUser(): Promise<{ id: string; email?: string | null }> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    throw new UnauthorizedError();
  }
  return { id, email: session.user?.email };
}
