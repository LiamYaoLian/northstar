import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { UnauthorizedError } from "@/lib/auth/errors";

const { requireUser, createTask, listSubtasks } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createTask: vi.fn(),
  listSubtasks: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/services/tasks", () => ({ createTask, listSubtasks }));

describe("POST /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSubtasks.mockResolvedValue([]);
  });

  it("returns 401 when unauthenticated", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());
    const res = await POST(
      new Request("http://localhost/api/tasks?tz=America/New_York", {
        method: "POST",
        body: JSON.stringify({ title: "Ship feature" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("accepts projectId on create", async () => {
    requireUser.mockResolvedValue({ id: "user-1", email: "a@test.com" });
    createTask.mockResolvedValue({ id: "t1", title: "Ship feature", projectId: "proj-1" });

    const res = await POST(
      new Request("http://localhost/api/tasks?tz=America/New_York", {
        method: "POST",
        body: JSON.stringify({
          title: "Ship feature",
          projectId: "proj-1",
          autoBreakdown: false,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Ship feature", projectId: "proj-1" }),
      "user-1",
      { tz: "America/New_York" },
    );
  });
});
