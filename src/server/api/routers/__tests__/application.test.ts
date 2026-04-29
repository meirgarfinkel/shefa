import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { applicationRouter } from "../application";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/jobs/schedule-application-notify", () => ({
  scheduleApplicationNotify: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockPrisma() {
  return {
    seekerProfile: { findUnique: vi.fn() },
    jobPosting: { findUnique: vi.fn() },
    application: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
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

const createCaller = createCallerFactory(applicationRouter);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SEEKER_PROFILE = { id: "seeker-profile-1" };
const ACTIVE_JOB = { id: "job-1", status: "ACTIVE", postedById: "employer-1" };
const CREATED_APPLICATION = {
  id: "app-1",
  seekerId: "user-1",
  seekerProfileId: "seeker-profile-1",
  jobId: "job-1",
  message: null,
  status: "SUBMITTED",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── submit ────────────────────────────────────────────────────────────────────

describe("submit", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("happy path: SEEKER applies to ACTIVE job with message", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(SEEKER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.create.mockResolvedValue(CREATED_APPLICATION);

    const result = await caller.submit({ jobId: "job-1", message: "I'm interested!" });

    expect(result).toEqual(CREATED_APPLICATION);
    expect(mockPrisma.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          seekerId: "user-1",
          seekerProfileId: "seeker-profile-1",
          jobId: "job-1",
          message: "I'm interested!",
        }),
      }),
    );
  });

  it("happy path: applies without message", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(SEEKER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.create.mockResolvedValue(CREATED_APPLICATION);

    await caller.submit({ jobId: "job-1" });

    expect(mockPrisma.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ message: undefined }),
      }),
    );
  });

  it("empty string message treated as undefined", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(SEEKER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.create.mockResolvedValue(CREATED_APPLICATION);

    await caller.submit({ jobId: "job-1", message: "" });

    expect(mockPrisma.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ message: undefined }),
      }),
    );
  });

  it("message exactly 500 chars is accepted", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(SEEKER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.create.mockResolvedValue(CREATED_APPLICATION);

    await expect(
      caller.submit({ jobId: "job-1", message: "a".repeat(500) }),
    ).resolves.toBeDefined();
  });

  it("message 501 chars → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    await expect(caller.submit({ jobId: "job-1", message: "a".repeat(501) })).rejects.toThrow();
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("EMPLOYER → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma));
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ADMIN → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockPrisma));
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("SEEKER with no profile → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(null);
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("job not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(SEEKER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(null);
    await expect(caller.submit({ jobId: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it.each(["DRAFT", "PAUSED", "EXPIRED", "FILLED", "CLOSED"])(
    "job status %s → FORBIDDEN",
    async (status) => {
      const caller = createCaller(makeCtx("SEEKER", mockPrisma));
      mockPrisma.seekerProfile.findUnique.mockResolvedValue(SEEKER_PROFILE);
      mockPrisma.jobPosting.findUnique.mockResolvedValue({ id: "job-1", status });
      await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );

  it("duplicate application → CONFLICT", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(SEEKER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.create.mockRejectedValue({ code: "P2002" });
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("scheduleApplicationNotify called with jobId and postedById after successful submit", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(SEEKER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.create.mockResolvedValue(CREATED_APPLICATION);

    await caller.submit({ jobId: "job-1" });

    const { scheduleApplicationNotify } = await import("@/server/jobs/schedule-application-notify");
    expect(vi.mocked(scheduleApplicationNotify)).toHaveBeenCalledWith("job-1", "employer-1");
  });

  it("scheduleApplicationNotify failure does not propagate — application still returned", async () => {
    const { scheduleApplicationNotify } = await import("@/server/jobs/schedule-application-notify");
    vi.mocked(scheduleApplicationNotify).mockRejectedValueOnce(new Error("Redis down"));

    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(SEEKER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.create.mockResolvedValue(CREATED_APPLICATION);

    await expect(caller.submit({ jobId: "job-1" })).resolves.toEqual(CREATED_APPLICATION);
  });
});

// ── listForSeeker ─────────────────────────────────────────────────────────────

describe("listForSeeker", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("happy path: returns own applications sorted desc", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    const apps = [
      { id: "app-1", status: "SUBMITTED" },
      { id: "app-2", status: "VIEWED" },
    ];
    mockPrisma.application.findMany.mockResolvedValue(apps);

    const result = await caller.listForSeeker();
    expect(result).toEqual(apps);
  });

  it("returns empty array when no applications", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.application.findMany.mockResolvedValue([]);

    const result = await caller.listForSeeker();
    expect(result).toEqual([]);
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.listForSeeker()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("EMPLOYER → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma));
    await expect(caller.listForSeeker()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("queries only the caller's own applications", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, "user-42"));
    mockPrisma.application.findMany.mockResolvedValue([]);

    await caller.listForSeeker();

    expect(mockPrisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ seekerId: "user-42" }),
      }),
    );
  });
});

// ── listForJob ────────────────────────────────────────────────────────────────

describe("listForJob", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;
  const JOB_ID = "job-1";

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("happy path: employer gets applications for own job", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "user-1"));
    mockPrisma.jobPosting.findUnique.mockResolvedValue({ id: JOB_ID, postedById: "user-1" });
    const apps = [{ id: "app-1", status: "SUBMITTED" }];
    mockPrisma.application.findMany.mockResolvedValue(apps);

    const result = await caller.listForJob({ jobId: JOB_ID });
    expect(result).toEqual(apps);
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.listForJob({ jobId: JOB_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("SEEKER → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    await expect(caller.listForJob({ jobId: JOB_ID })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("job belongs to different employer → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "user-1"));
    mockPrisma.jobPosting.findUnique.mockResolvedValue({ id: JOB_ID, postedById: "user-2" });

    await expect(caller.listForJob({ jobId: JOB_ID })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("job not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma));
    mockPrisma.jobPosting.findUnique.mockResolvedValue(null);

    await expect(caller.listForJob({ jobId: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ── withdraw ──────────────────────────────────────────────────────────────────

describe("withdraw", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("happy path: seeker withdraws own application", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, "user-1"));
    mockPrisma.application.findUnique.mockResolvedValue({ id: "app-1", seekerId: "user-1" });
    const updated = { id: "app-1", status: "CLOSED" };
    mockPrisma.application.update.mockResolvedValue(updated);

    const result = await caller.withdraw({ id: "app-1" });
    expect(result).toEqual(updated);
    expect(mockPrisma.application.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "CLOSED" } }),
    );
  });

  it("already-closed application → idempotent success", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, "user-1"));
    mockPrisma.application.findUnique.mockResolvedValue({
      id: "app-1",
      seekerId: "user-1",
      status: "CLOSED",
    });
    mockPrisma.application.update.mockResolvedValue({ id: "app-1", status: "CLOSED" });

    await expect(caller.withdraw({ id: "app-1" })).resolves.toBeDefined();
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.withdraw({ id: "app-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("EMPLOYER → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma));
    await expect(caller.withdraw({ id: "app-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("application not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    mockPrisma.application.findUnique.mockResolvedValue(null);
    await expect(caller.withdraw({ id: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("application owned by different seeker → NOT_FOUND (not FORBIDDEN)", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, "user-1"));
    mockPrisma.application.findUnique.mockResolvedValue({ id: "app-1", seekerId: "user-2" });
    await expect(caller.withdraw({ id: "app-1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ── updateStatus ──────────────────────────────────────────────────────────────

describe("updateStatus", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it.each(["VIEWED", "RESPONDED", "CLOSED"] as const)(
    "happy path: employer sets status to %s",
    async (status) => {
      const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "user-1"));
      mockPrisma.application.findUnique.mockResolvedValue({
        id: "app-1",
        job: { postedById: "user-1" },
      });
      mockPrisma.application.update.mockResolvedValue({ id: "app-1", status });

      const result = await caller.updateStatus({ id: "app-1", status });
      expect(result).toMatchObject({ status });
    },
  );

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.updateStatus({ id: "app-1", status: "VIEWED" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("SEEKER → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma));
    await expect(caller.updateStatus({ id: "app-1", status: "VIEWED" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("application for different employer's job → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "user-1"));
    mockPrisma.application.findUnique.mockResolvedValue({
      id: "app-1",
      job: { postedById: "user-2" },
    });
    await expect(caller.updateStatus({ id: "app-1", status: "VIEWED" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("application not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma));
    mockPrisma.application.findUnique.mockResolvedValue(null);
    await expect(
      caller.updateStatus({ id: "nonexistent", status: "VIEWED" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("status SUBMITTED rejected by Zod", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma));
    // @ts-expect-error intentionally invalid status
    await expect(caller.updateStatus({ id: "app-1", status: "SUBMITTED" })).rejects.toThrow();
  });
});
