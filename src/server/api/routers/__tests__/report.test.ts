import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { reportRouter } from "../report";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockPrisma() {
  return {
    report: { create: vi.fn() },
  };
}

type Role = "SEEKER" | "EMPLOYER" | "ADMIN";

function makeCtx(role: Role | null, prisma: ReturnType<typeof makeMockPrisma>, userId = "user-1") {
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
    prisma: prisma as any,
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
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("happy path: seeker reports a user", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, "user-1"));
    mockPrisma.report.create.mockResolvedValue(CREATED_REPORT);

    const result = await caller.submit({ targetType: "USER", targetId: "user-2", reason: "Spam" });

    expect(result).toEqual(CREATED_REPORT);
    expect(mockPrisma.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterId: "user-1",
          targetType: "USER",
          targetId: "user-2",
          reason: "Spam",
        }),
      }),
    );
  });

  it("happy path: employer reports a job posting", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "user-1"));
    mockPrisma.report.create.mockResolvedValue({ ...CREATED_REPORT, targetType: "JOB" });

    await expect(
      caller.submit({ targetType: "JOB", targetId: "job-1", reason: "Fake listing" }),
    ).resolves.toBeDefined();
  });

  it("happy path: user reports a message", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, "user-1"));
    mockPrisma.report.create.mockResolvedValue({ ...CREATED_REPORT, targetType: "MESSAGE" });

    await expect(
      caller.submit({ targetType: "MESSAGE", targetId: "msg-1", reason: "Harassment" }),
    ).resolves.toBeDefined();
  });

  it("reason exactly 2000 chars is accepted", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.report.create.mockResolvedValue(CREATED_REPORT);

    await expect(
      caller.submit({ targetType: "USER", targetId: "user-2", reason: "a".repeat(2000) }),
    ).resolves.toBeDefined();
  });

  it("reason 2001 chars → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    await expect(
      caller.submit({ targetType: "USER", targetId: "user-2", reason: "a".repeat(2001) }),
    ).rejects.toThrow();
  });

  it("empty reason → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    await expect(
      caller.submit({ targetType: "USER", targetId: "user-2", reason: "" }),
    ).rejects.toThrow();
  });

  it("reporter targeting themselves → BAD_REQUEST", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, "user-1"));
    await expect(
      caller.submit({ targetType: "USER", targetId: "user-1", reason: "test" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("invalid targetType → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    await expect(
      // @ts-expect-error intentionally invalid targetType
      caller.submit({ targetType: "PROFILE", targetId: "x", reason: "test" }),
    ).rejects.toThrow();
  });

  it("reporterId is always set to the caller's id, not a supplied value", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, "real-user"));
    mockPrisma.report.create.mockResolvedValue({ ...CREATED_REPORT, reporterId: "real-user" });

    await caller.submit({ targetType: "USER", targetId: "user-2", reason: "Spam" });

    expect(mockPrisma.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reporterId: "real-user" }),
      }),
    );
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(
      caller.submit({ targetType: "USER", targetId: "user-2", reason: "Spam" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
