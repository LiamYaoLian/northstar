import { NextResponse } from "next/server";
import {
  getStrategy,
  hasStrategy,
  saveStrategy,
  applyLifeBalanceTemplate,
  updateNorthStar,
} from "@/lib/services/strategy";
import { updateNorthStarSchema } from "@/lib/api/strategy/schemas";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function GET() {
  try {
    const user = await requireUser();
    const strategy = await getStrategy(user.id);
    return NextResponse.json({
      hasStrategy: await hasStrategy(user.id),
      strategy,
    });
  } catch (err) {
    return toApiError(err, "Failed to load strategy");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    if (body.action === "template") {
      const strategy = await applyLifeBalanceTemplate(
        user.id,
        body.workTrack ?? "big_tech",
        {
          statement: body.statement,
          horizon: body.horizon,
          hoursPerWeek: body.hoursPerWeek,
        },
      );
      return NextResponse.json({ strategy });
    }

    const strategy = await saveStrategy(user.id, body);
    return NextResponse.json({ strategy });
  } catch (err) {
    return toApiError(err, "Failed to save strategy");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = updateNorthStarSchema.parse(await request.json());
    const strategy = await updateNorthStar(body, user.id);
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }
    return NextResponse.json({ strategy });
  } catch (err) {
    return toApiError(err, "Invalid request");
  }
}
