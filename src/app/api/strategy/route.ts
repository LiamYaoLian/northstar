import { NextResponse } from "next/server";
import {
  getStrategy,
  hasStrategy,
  saveStrategy,
  applyLifeBalanceTemplate,
  updateNorthStar,
} from "@/lib/services/strategy";
import { updateNorthStarSchema } from "@/lib/api/strategy/schemas";

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

export async function PATCH(request: Request) {
  try {
    const body = updateNorthStarSchema.parse(await request.json());
    const strategy = await updateNorthStar(body);
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }
    return NextResponse.json({ strategy });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
