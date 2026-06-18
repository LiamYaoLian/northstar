import { NextResponse } from "next/server";
import { ensureDbReady, getDb } from "@/lib/db";
import { strategicPillars } from "@/lib/db/schema";
import { classifyTaskTitle } from "@/lib/tasks/classify";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title : "";
    await ensureDbReady();
    const pillars = await getDb().select().from(strategicPillars);
    const classification = await classifyTaskTitle(title, pillars);
    return NextResponse.json({ classification });
  } catch (err) {
    console.error("POST /api/tasks/classify", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Classify failed" },
      { status: 500 },
    );
  }
}
