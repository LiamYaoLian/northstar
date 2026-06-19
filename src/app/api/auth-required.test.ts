import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@/lib/auth/errors";

const { requireUser } = vi.hoisted(() => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));

describe("API routes require authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockRejectedValue(new UnauthorizedError());
  });

  it("GET /api/strategy returns 401 when unauthenticated", async () => {
    const { GET } = await import("@/app/api/strategy/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET /api/alignment returns 401 when unauthenticated", async () => {
    const { GET } = await import("@/app/api/alignment/route");
    const res = await GET(new Request("http://localhost/api/alignment?tz=America/New_York"));
    expect(res.status).toBe(401);
  });

  it("GET /api/reviews returns 401 when unauthenticated", async () => {
    const { GET } = await import("@/app/api/reviews/route");
    const res = await GET(new Request("http://localhost/api/reviews?tz=America/New_York"));
    expect(res.status).toBe(401);
  });

  it("GET /api/completions returns 401 when unauthenticated", async () => {
    const { GET } = await import("@/app/api/completions/route");
    const res = await GET(
      new Request(
        "http://localhost/api/completions?since=2026-01-01&until=2026-12-31&tz=America/New_York",
      ),
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/time-entries returns 401 when unauthenticated", async () => {
    const { GET } = await import("@/app/api/time-entries/route");
    const res = await GET(new Request("http://localhost/api/time-entries"));
    expect(res.status).toBe(401);
  });

  it("POST /api/critique returns 401 when unauthenticated", async () => {
    const { POST } = await import("@/app/api/critique/route");
    const res = await POST(
      new Request("http://localhost/api/critique", {
        method: "POST",
        body: JSON.stringify({ text: "hello" }),
      }),
    );
    expect(res.status).toBe(401);
  });
});
