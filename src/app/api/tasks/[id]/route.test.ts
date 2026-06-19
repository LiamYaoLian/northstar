import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";
import { UnauthorizedError } from "@/lib/auth/errors";

const { requireUser, updateTask } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/services/tasks", () => ({ updateTask }));

describe("PATCH /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());
    const res = await PATCH(
      new Request("http://localhost/api/tasks/t1?tz=America/New_York", {
        method: "PATCH",
        body: JSON.stringify({ projectId: "proj-1" }),
      }),
      { params: Promise.resolve({ id: "t1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("accepts projectId on update", async () => {
    requireUser.mockResolvedValue({ id: "user-1", email: "a@test.com" });
    updateTask.mockResolvedValue({ id: "t1", projectId: "proj-1" });

    const res = await PATCH(
      new Request("http://localhost/api/tasks/t1?tz=America/New_York", {
        method: "PATCH",
        body: JSON.stringify({ projectId: "proj-1" }),
      }),
      { params: Promise.resolve({ id: "t1" }) },
    );

    expect(res.status).toBe(200);
    expect(updateTask).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({ projectId: "proj-1" }),
      { tz: "America/New_York", userId: "user-1" },
    );
  });
});
