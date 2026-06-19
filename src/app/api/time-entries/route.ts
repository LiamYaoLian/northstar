import { NextResponse } from "next/server";
import { addTimeEntry, listTimeEntries } from "@/lib/services/tasks";
import { requireUser } from "@/lib/auth/require-user";
import { toApiError } from "@/lib/auth/errors";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ entries: await listTimeEntries(user.id) });
  } catch (err) {
    return toApiError(err, "Failed to list time entries");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const entry = await addTimeEntry(body, user.id);
    if (!entry) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (err) {
    return toApiError(err, "Failed to add time entry");
  }
}
