import { NextResponse } from "next/server";
import {
  getStrategy,
  hasStrategy,
  saveStrategy,
  applyLifeBalanceTemplate,
} from "@/lib/services/strategy";

export async function GET() {
  const strategy = await getStrategy();
  return NextResponse.json({
    hasStrategy: await hasStrategy(),
    strategy,
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "template") {
    const strategy = await applyLifeBalanceTemplate(body.workTrack ?? "big_tech", {
      statement: body.statement,
      horizon: body.horizon,
      hoursPerWeek: body.hoursPerWeek,
    });
    return NextResponse.json({ strategy });
  }

  const strategy = await saveStrategy(body);
  return NextResponse.json({ strategy });
}
