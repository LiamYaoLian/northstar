import { NextResponse } from "next/server";
import { addTimeEntry, listTimeEntries } from "@/lib/services/tasks";

export async function GET() {
  return NextResponse.json({ entries: await listTimeEntries() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const entry = await addTimeEntry(body);
  return NextResponse.json({ entry });
}
