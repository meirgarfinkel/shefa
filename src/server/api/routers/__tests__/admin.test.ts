import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { adminRouter } from "../admin";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

function makeMockDb() {
  // Shared groupBy mock so mostBlocked's two select() calls can be queued in order.
  const groupBy = vi.fn().mockResolvedValue([]);
  return {
    query: {
      report: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      users: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      jobPosting: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      message: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      seekerProfile: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      employerProfile: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
          then: (r: (v: unknown) => unknown) => Promise.resolve(undefined).then(r),
        }),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ groupBy }),
      }),
    }),
    _groupBy: groupBy,
  };
}

type Role = "SEEKER" | "EMPLOYER" | "ADMIN";

function makeCtx(role: Role | null, db: ReturnType<typeof makeMockDb>, userId = "admin-1") {
  return {
    headers: new Headers(),
    session:
      role !== null
        ? {
            user: { id: userId, email: "admin@example.com", name: null, image: null, role },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }
        : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: db as any,
  };
}

const createCaller = createCallerFactory(adminRouter);

describe("admin authorization", () => {
  let mockDb: ReturnType<typeof makeMockDb>;
  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.listReports()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each(["SEEKER", "EMPLOYER"] as const)("%s → FORBIDDEN", async (role) => {
    const caller = createCaller(makeCtx(role, mockDb));
    await expect(caller.listReports()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.updateReportStatus({ reportId: "r-1", status: "REVIEWED" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.setUserSuspension({ userId: "u-1", suspended: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.mostBlocked()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("mostBlocked", () => {
  let mockDb: ReturnType<typeof makeMockDb>;
  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("merges block counts across roles, sorts desc, and flags suspension", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    // First select() = blocks against seekers; second = blocks against employers.
    mockDb._groupBy
      .mockResolvedValueOnce([
        { uid: "u-1", blocks: 2 },
        { uid: "u-2", blocks: 1 },
      ])
      .mockResolvedValueOnce([{ uid: "u-1", blocks: 3 }]);
    mockDb.query.users.findMany.mockResolvedValue([
      { id: "u-1", name: "A", email: "a@x.com", role: "SEEKER" },
      { id: "u-2", name: "B", email: "b@x.com", role: "EMPLOYER" },
    ]);
    mockDb.query.seekerProfile.findMany.mockResolvedValue([{ userId: "u-1", status: "SUSPENDED" }]);

    const result = await caller.mostBlocked();

    expect(result).toEqual([
      {
        userId: "u-1",
        blockCount: 5,
        user: expect.objectContaining({ id: "u-1" }),
        suspended: true,
      },
      {
        userId: "u-2",
        blockCount: 1,
        user: expect.objectContaining({ id: "u-2" }),
        suspended: false,
      },
    ]);
  });

  it("returns empty list when nobody is blocked", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    const result = await caller.mostBlocked();
    expect(result).toEqual([]);
  });
});

describe("listReports", () => {
  let mockDb: ReturnType<typeof makeMockDb>;
  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("resolves a USER target and its suspension state", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    mockDb.query.report.findMany.mockResolvedValue([
      { id: "r-1", targetType: "USER", targetId: "u-9", reason: "spam", status: "OPEN" },
    ]);
    mockDb.query.users.findMany.mockResolvedValue([
      { id: "u-9", name: "Bad Actor", email: "bad@x.com" },
    ]);
    mockDb.query.seekerProfile.findMany.mockResolvedValue([{ userId: "u-9", status: "SUSPENDED" }]);

    const result = await caller.listReports({ status: "OPEN" });

    expect(result).toHaveLength(1);
    expect(result[0]!.target).toMatchObject({
      type: "USER",
      user: { id: "u-9", email: "bad@x.com" },
      suspended: true,
    });
  });

  it("resolves a JOB target", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    mockDb.query.report.findMany.mockResolvedValue([
      { id: "r-2", targetType: "JOB", targetId: "j-1", reason: "scam", status: "OPEN" },
    ]);
    mockDb.query.jobPosting.findMany.mockResolvedValue([
      { id: "j-1", title: "Fake job", status: "ACTIVE", employerId: "e-1" },
    ]);

    const result = await caller.listReports();
    expect(result[0]!.target).toMatchObject({ type: "JOB", job: { id: "j-1", title: "Fake job" } });
  });
});

describe("updateReportStatus", () => {
  let mockDb: ReturnType<typeof makeMockDb>;
  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("updates and returns the report", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "r-1", status: "ACTIONED" }]),
        }),
      }),
    });
    const result = await caller.updateReportStatus({ reportId: "r-1", status: "ACTIONED" });
    expect(result).toMatchObject({ status: "ACTIONED" });
  });

  it("missing report → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    await expect(
      caller.updateReportStatus({ reportId: "ghost", status: "REVIEWED" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("setUserSuspension", () => {
  let mockDb: ReturnType<typeof makeMockDb>;
  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("cannot suspend yourself → BAD_REQUEST", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb, "admin-1"));
    await expect(
      caller.setUserSuspension({ userId: "admin-1", suspended: true }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("target user not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    mockDb.query.users.findFirst.mockResolvedValue(null);
    await expect(
      caller.setUserSuspension({ userId: "ghost", suspended: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("cannot suspend another admin → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    mockDb.query.users.findFirst.mockResolvedValue({ id: "u-2", role: "ADMIN" });
    await expect(
      caller.setUserSuspension({ userId: "u-2", suspended: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("suspends a regular user and updates profile tables", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    mockDb.query.users.findFirst.mockResolvedValue({ id: "u-3", role: "SEEKER" });
    const setMock = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockDb.update.mockReturnValue({ set: setMock });

    const result = await caller.setUserSuspension({ userId: "u-3", suspended: true });

    expect(result).toEqual({ userId: "u-3", suspended: true });
    expect(setMock).toHaveBeenCalledWith({ status: "SUSPENDED" });
    expect(mockDb.update).toHaveBeenCalledTimes(2); // seeker + employer profile tables
  });
});
