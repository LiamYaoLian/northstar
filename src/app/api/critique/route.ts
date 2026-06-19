import { NextResponse } from "next/server";
import { analyzeBrainDump } from "@/lib/strategy/critique";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function POST(request: Request) {
  try {
    await requireUser();
    const { brainDump } = await request.json();
    const critique = analyzeBrainDump(brainDump ?? "");
    return NextResponse.json({ critique });
  } catch (err) {
    return toApiError(err, "Failed to critique strategy");
  }
}
