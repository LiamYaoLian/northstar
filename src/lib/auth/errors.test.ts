import { describe, expect, it } from "vitest";
import { UnauthorizedError, toApiError } from "@/lib/auth/errors";

describe("toApiError", () => {
  it("maps UnauthorizedError to 401", async () => {
    const res = toApiError(new UnauthorizedError());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Authentication required" });
  });

  it("maps generic Error to 500 with message", async () => {
    const res = toApiError(new Error("boom"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "boom" });
  });

  it("uses fallback for non-Error values", async () => {
    const res = toApiError("nope", "Something failed");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Something failed" });
  });
});
