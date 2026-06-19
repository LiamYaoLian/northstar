import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";
import { UnauthorizedError } from "@/lib/auth/errors";

const { requireUser, updateProject } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/services/projects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/projects")>();
  return { ...actual, updateProject };
});

describe("PATCH /api/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());
    const res = await PATCH(
      new Request("http://localhost/api/projects/p1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Renamed" }),
      }),
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("archives and renames projects", async () => {
    requireUser.mockResolvedValue({ id: "user-1", email: "a@test.com" });
    updateProject.mockResolvedValue({
      id: "p1",
      name: "Renamed",
      status: "archived",
    });

    const res = await PATCH(
      new Request("http://localhost/api/projects/p1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Renamed", status: "archived" }),
      }),
      { params: Promise.resolve({ id: "p1" }) },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      project: { id: "p1", name: "Renamed", status: "archived" },
    });
    expect(updateProject).toHaveBeenCalledWith(
      "p1",
      { name: "Renamed", status: "archived" },
      "user-1",
    );
  });

  it("returns 404 when project is missing", async () => {
    requireUser.mockResolvedValue({ id: "user-1", email: "a@test.com" });
    updateProject.mockResolvedValue(null);

    const res = await PATCH(
      new Request("http://localhost/api/projects/missing", {
        method: "PATCH",
        body: JSON.stringify({ status: "archived" }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });
});
