import { ensureDbReady, getDb } from "@/lib/db";
import { northStars } from "@/lib/db/schema";
import { isNotNull } from "drizzle-orm";

/** Integration tests: any user id that already has a north star in the test DB. */
export async function anyUserIdWithStrategy(): Promise<string> {
  await ensureDbReady();
  const [row] = await getDb()
    .select({ userId: northStars.userId })
    .from(northStars)
    .where(isNotNull(northStars.userId))
    .limit(1);
  if (!row?.userId) {
    throw new Error("no strategy in test database — run migrations or seed first");
  }
  return row.userId;
}
