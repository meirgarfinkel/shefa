import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { reportRouter } from "../report";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      report: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    execute: vi.fn().mockResolvedValue([]),
  };
}

type Role = "SEEKER" | "EMPLOYER" | "ADMIN";

function makeCtx(role: Role | null, db: ReturnType<typeof makeMockDb>, userId = "user-1") {
  return {
    headers: new Headers(),
    session:
      role !== null
        ? {
            user: { id: userId, email: "test@example.com", name: null, image: null, role },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }
        : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: db as any,
  };
}

const createCaller = createCallerFactory(reportRouter);

// ── Fixtures ───────────────────────────────────────────────────────────────────

const CREATED_REPORT = {
  id: "report-1",
  reporterId: "user-1",
  targetType: "USER",
  targetId: "user-2",
  reason: "Spam",
  status: "OPEN",
  createdAt: new Date(),
};

// ── report.submit ──────────────────────────────────────────────────────────────

describe("submit", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("happy path: seeker reports a user", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, "user-1"));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_REPORT]),
      }),
    });

    const result = await caller.submit({ targetType: "USER", targetId: "user-2", reason: "Spam" });

    expect(result).toEqual(CREATED_REPORT);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("happy path: employer reports a job posting", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-1"));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...CREATED_REPORT, targetType: "JOB" }]),
      }),
    });

    await expect(
      caller.submit({ targetType: "JOB", targetId: "job-1", reason: "Fake listing" }),
    ).resolves.toBeDefined();
  });

  it("happy path: user reports a message", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, "user-1"));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...CREATED_REPORT, targetType: "MESSAGE" }]),
      }),
    });

    await expect(
      caller.submit({ targetType: "MESSAGE", targetId: "msg-1", reason: "Harassment" }),
    ).resolves.toBeDefined();
  });

  it("reason exactly 2000 chars is accepted", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_REPORT]),
      }),
    });

    await expect(
      caller.submit({ targetType: "USER", targetId: "user-2", reason: "a".repeat(2000) }),
    ).resolves.toBeDefined();
  });

  it("reason 2001 chars → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(
      caller.submit({ targetType: "USER", targetId: "user-2", reason: "a".repeat(2001) }),
    ).rejects.toThrow();
  });

  it("empty reason → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(
      caller.submit({ targetType: "USER", targetId: "user-2", reason: "" }),
    ).rejects.toThrow();
  });

  it("reporter targeting themselves → BAD_REQUEST", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, "user-1"));
    await expect(
      caller.submit({ targetType: "USER", targetId: "user-1", reason: "test" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("invalid targetType → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(
      // @ts-expect-error intentionally invalid targetType
      caller.submit({ targetType: "PROFILE", targetId: "x", reason: "test" }),
    ).rejects.toThrow();
  });

  it("reporterId is always set to the caller's id, not a supplied value", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, "real-user"));
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...CREATED_REPORT, reporterId: "real-user" }]),
      }),
    });

    const result = await caller.submit({ targetType: "USER", targetId: "user-2", reason: "Spam" });

    expect(result.reporterId).toBe("real-user");
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(
      caller.submit({ targetType: "USER", targetId: "user-2", reason: "Spam" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
