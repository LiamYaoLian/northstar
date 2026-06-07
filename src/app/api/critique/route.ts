import { NextResponse } from "next/server";
import { analyzeBrainDump } from "@/lib/strategy/critique";

export async function POST(request: Request) {
  const { brainDump } = await request.json();
  const critique = analyzeBrainDump(brainDump ?? "");
  return NextResponse.json({ critique });
}
