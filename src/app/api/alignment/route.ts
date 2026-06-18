import { NextResponse } from "next/server";
import { getAlignmentDashboard } from "@/lib/services/alignment";

export async function GET() {
  return NextResponse.json(await getAlignmentDashboard());
}
