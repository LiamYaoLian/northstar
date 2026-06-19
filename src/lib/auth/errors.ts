import { NextResponse } from "next/server";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function toApiError(err: unknown, fallback = "Request failed") {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : fallback },
    { status: 500 },
  );
}
