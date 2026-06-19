import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { UnauthorizedError } from "@/lib/auth/errors";

const { requireUser, listProjects, createProject } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  listProjects: vi.fn(),
  createProject: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/services/projects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/projects")>();
  return {
    ...actual,
    listProjects,
    createProject,
  };
});

describe("GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());
    const res = await GET(new Request("http://localhost/api/projects"));
    expect(res.status).toBe(401);
  });

  it("returns active projects for the current user", async () => {
    requireUser.mockResolvedValue({ id: "user-1", email: "a@test.com" });
    listProjects.mockResolvedValue([{ id: "proj-1", name: "Northstar" }]);

    const res = await GET(new Request("http://localhost/api/projects"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      projects: [{ id: "proj-1", name: "Northstar" }],
    });
    expect(listProjects).toHaveBeenCalledWith("user-1", { includeArchived: false });
  });

  it("passes includeArchived when query param is set", async () => {
    requireUser.mockResolvedValue({ id: "user-1", email: "a@test.com" });
    listProjects.mockResolvedValue([]);

    await GET(new Request("http://localhost/api/projects?includeArchived=1"));
    expect(listProjects).toHaveBeenCalledWith("user-1", { includeArchived: true });
  });
});

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());
    const res = await POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "X", pillarId: "p1" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when pillarId is missing", async () => {
    requireUser.mockResolvedValue({ id: "user-1", email: "a@test.com" });
    const res = await POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "Launch" }),
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "pillarId is required" });
  });

  it("creates a project for the current user", async () => {
    requireUser.mockResolvedValue({ id: "user-1", email: "a@test.com" });
    createProject.mockResolvedValue({ id: "proj-1", name: "Launch" });

    const res = await POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "Launch",
          pillarId: "p-work",
          focusTrack: "进大厂",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ project: { id: "proj-1", name: "Launch" } });
    expect(createProject).toHaveBeenCalledWith(
      { name: "Launch", pillarId: "p-work", focusTrack: "进大厂" },
      "user-1",
    );
  });
});
