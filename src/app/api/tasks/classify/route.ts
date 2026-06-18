import { NextResponse } from "next/server";
import { ensureDbReady, getDb } from "@/lib/db";
import { strategicPillars } from "@/lib/db/schema";
import { analyzeTaskTitle } from "@/lib/tasks/analyze";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title : "";
    await ensureDbReady();
    const pillars = await getDb().select().from(strategicPillars);
    const { classification, estimate } = await analyzeTaskTitle(title, pillars);
    return NextResponse.json({ classification, estimate });
  } catch (err) {
    console.error("POST /api/tasks/classify", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Classify failed" },
      { status: 500 },
    );
  }
}
