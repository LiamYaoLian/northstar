import { NextResponse } from "next/server";
import { ensureDbReady, getDb } from "@/lib/db";
import { strategicPillars } from "@/lib/db/schema";
import { analyzeTaskTitle } from "@/lib/tasks/analyze";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await requireUser();
    const title = typeof body.title === "string" ? body.title : "";
    await ensureDbReady();
    const pillars = await getDb()
      .select()
      .from(strategicPillars)
      .where(eq(strategicPillars.userId, user.id));
    const { classification, estimate, recurrence } = await analyzeTaskTitle(
      title,
      pillars,
    );
    return NextResponse.json({ classification, estimate, recurrence });
  } catch (err) {
    console.error("POST /api/tasks/classify", err);
    return toApiError(err, "Classify failed");
  }
}
