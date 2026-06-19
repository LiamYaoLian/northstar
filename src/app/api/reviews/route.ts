import { NextResponse } from "next/server";
import { InvalidTimezoneError, resolveTimezone } from "@/lib/tasks/timezone";
import { getReviewDashboard, saveReviewSnapshot } from "@/lib/services/reviews";
import type { ReviewPeriod } from "@/lib/review/period";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

function parsePeriod(value: string | null): ReviewPeriod {
  return value === "month" ? "month" : "week";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const user = await requireUser();
    const period = parsePeriod(url.searchParams.get("period"));
    const tz = resolveTimezone(url.searchParams.get("tz"));
    const dashboard = await getReviewDashboard(user.id, period, tz, new Date());
    if (!dashboard) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }
    return NextResponse.json(dashboard);
  } catch (err) {
    if (err instanceof InvalidTimezoneError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return toApiError(err, "Failed to load reviews");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await requireUser();
    const period = parsePeriod(body.period ?? null);
    const tz = resolveTimezone(body.tz);
    const snapshot = await saveReviewSnapshot(user.id, period, tz, new Date());
    if (!snapshot) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }
    return NextResponse.json({ snapshot });
  } catch (err) {
    if (err instanceof InvalidTimezoneError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return toApiError(err, "Failed to save review");
  }
}
