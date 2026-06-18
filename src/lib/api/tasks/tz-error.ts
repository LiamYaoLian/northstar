import { NextResponse } from "next/server";
import { InvalidTimezoneError } from "@/lib/tasks/timezone";

export function tzErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof InvalidTimezoneError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return null;
}
