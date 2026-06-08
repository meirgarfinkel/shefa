import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { applicationRouter } from "../application";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/jobs/application-notify.job", () => ({
  runApplicationNotifyJob: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      seekerProfile: { findFirst: vi.fn(), findMany: vi.fn() },
      employerProfile: { findFirst: vi.fn(), findMany: vi.fn() },
      jobPosting: { findFirst: vi.fn(), findMany: vi.fn() },
      application: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    $count: vi.fn().mockResolvedValue(0),
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
        where: vi.fn().mockReturnValue({}),
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

const createCaller = createCallerFactory(applicationRouter);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SEEKER_PROFILE = { id: "seeker-profile-1" };
const ACTIVE_JOB = { id: "job-1", status: "ACTIVE", employerId: "employer-1" };
const CREATED_APPLICATION = {
  id: "app-1",
  seekerId: "user-1",
  jobId: "job-1",
  message: null,
  status: "SUBMITTED",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── submit ────────────────────────────────────────────────────────────────────

describe("submit", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("happy path: SEEKER applies to ACTIVE job with message", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_APPLICATION]),
      }),
    });

    const result = await caller.submit({ jobId: "job-1", message: "I'm interested!" });

    expect(result).toEqual(CREATED_APPLICATION);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("happy path: applies without message", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_APPLICATION]),
      }),
    });

    const result = await caller.submit({ jobId: "job-1" });

    expect(result).toMatchObject({ seekerId: "user-1" });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("empty string message treated as undefined", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_APPLICATION]),
      }),
    });

    await caller.submit({ jobId: "job-1", message: "" });

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("message exactly 500 chars is accepted", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_APPLICATION]),
      }),
    });

    await expect(
      caller.submit({ jobId: "job-1", message: "a".repeat(500) }),
    ).resolves.toBeDefined();
  });

  it("message 501 chars → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(caller.submit({ jobId: "job-1", message: "a".repeat(501) })).rejects.toThrow();
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("EMPLOYER → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ADMIN → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("SEEKER with no profile → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(null);
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("job not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(null);
    await expect(caller.submit({ jobId: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it.each(["PAUSED", "CLOSED"])("job status %s → FORBIDDEN", async (status) => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue({ id: "job-1", status });
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("duplicate application → CONFLICT", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue({ code: "23505" }),
      }),
    });
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("runApplicationNotifyJob called with jobId and employerId after successful submit", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_APPLICATION]),
      }),
    });

    await caller.submit({ jobId: "job-1" });

    const { runApplicationNotifyJob } = await import("@/server/jobs/application-notify.job");
    expect(vi.mocked(runApplicationNotifyJob)).toHaveBeenCalledWith({
      jobId: "job-1",
      employerId: "employer-1",
    });
  });

  it("runApplicationNotifyJob failure does not propagate — application still returned", async () => {
    const { runApplicationNotifyJob } = await import("@/server/jobs/application-notify.job");
    vi.mocked(runApplicationNotifyJob).mockRejectedValueOnce(new Error("Resend down"));

    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_APPLICATION]),
      }),
    });

    await expect(caller.submit({ jobId: "job-1" })).resolves.toEqual(CREATED_APPLICATION);
  });

  it("suspended seeker → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({
      id: "seeker-profile-1",
      status: "SUSPENDED",
    });
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("job owned by a suspended employer → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.query.employerProfile.findFirst.mockResolvedValue({ status: "SUSPENDED" });
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("at the daily application limit → TOO_MANY_REQUESTS", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.$count.mockResolvedValue(25);
    await expect(caller.submit({ jobId: "job-1" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("just under the daily limit → allowed", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.$count.mockResolvedValue(24);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_APPLICATION]),
      }),
    });
    await expect(caller.submit({ jobId: "job-1" })).resolves.toEqual(CREATED_APPLICATION);
  });
});

// ── listForSeeker ─────────────────────────────────────────────────────────────

describe("listForSeeker", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("happy path: returns own applications sorted desc", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    const apps = [
      { id: "app-1", status: "SUBMITTED" },
      { id: "app-2", status: "VIEWED" },
    ];
    mockDb.query.application.findMany.mockResolvedValue(apps);

    const result = await caller.listForSeeker();
    expect(result).toEqual(apps);
  });

  it("returns empty array when no applications", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.application.findMany.mockResolvedValue([]);

    const result = await caller.listForSeeker();
    expect(result).toEqual([]);
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.listForSeeker()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("EMPLOYER → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    await expect(caller.listForSeeker()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("queries only the caller's own applications", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, "user-42"));
    mockDb.query.application.findMany.mockResolvedValue([]);

    await caller.listForSeeker();

    expect(mockDb.query.application.findMany).toHaveBeenCalled();
  });
});

// ── listForJob ────────────────────────────────────────────────────────────────

describe("listForJob", () => {
  let mockDb: ReturnType<typeof makeMockDb>;
  const JOB_ID = "job-1";

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("happy path: employer gets applications for own job", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-1"));
    mockDb.query.jobPosting.findFirst.mockResolvedValue({ id: JOB_ID, employerId: "user-1" });
    const apps = [{ id: "app-1", status: "SUBMITTED" }];
    mockDb.query.application.findMany.mockResolvedValue(apps);

    const result = await caller.listForJob({ jobId: JOB_ID });
    expect(result).toEqual(apps);
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.listForJob({ jobId: JOB_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("SEEKER → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(caller.listForJob({ jobId: JOB_ID })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("job belongs to different employer → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-1"));
    mockDb.query.jobPosting.findFirst.mockResolvedValue({ id: JOB_ID, employerId: "user-2" });

    await expect(caller.listForJob({ jobId: JOB_ID })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("job not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    mockDb.query.jobPosting.findFirst.mockResolvedValue(null);

    await expect(caller.listForJob({ jobId: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ── updateStatus ──────────────────────────────────────────────────────────────

describe("updateStatus", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it.each(["VIEWED", "REJECTED", "CLOSED"] as const)(
    "happy path: employer sets status to %s",
    async (status) => {
      const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-1"));
      mockDb.query.application.findFirst.mockResolvedValue({
        id: "app-1",
        job: { employerId: "user-1" },
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "app-1", status }]),
          }),
        }),
      });

      const result = await caller.updateStatus({ id: "app-1", status });
      expect(result).toMatchObject({ status });
    },
  );

  it("CLOSED transition sets closedAt", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-1"));
    mockDb.query.application.findFirst.mockResolvedValue({
      id: "app-1",
      job: { employerId: "user-1" },
    });
    const closedAt = new Date();
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "app-1", status: "CLOSED", closedAt }]),
        }),
      }),
    });

    const result = await caller.updateStatus({ id: "app-1", status: "CLOSED" });
    expect(result).toMatchObject({ status: "CLOSED" });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("REJECTED transition does not set closedAt", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-1"));
    mockDb.query.application.findFirst.mockResolvedValue({
      id: "app-1",
      job: { employerId: "user-1" },
    });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "app-1", status: "REJECTED" }]),
        }),
      }),
    });

    const result = await caller.updateStatus({ id: "app-1", status: "REJECTED" });
    expect(result).toMatchObject({ status: "REJECTED" });
    expect(result).not.toHaveProperty("closedAt");
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.updateStatus({ id: "app-1", status: "VIEWED" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("SEEKER → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(caller.updateStatus({ id: "app-1", status: "VIEWED" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("application for different employer's job → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-1"));
    mockDb.query.application.findFirst.mockResolvedValue({
      id: "app-1",
      job: { employerId: "user-2" },
    });
    await expect(caller.updateStatus({ id: "app-1", status: "VIEWED" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("application not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    mockDb.query.application.findFirst.mockResolvedValue(null);
    await expect(
      caller.updateStatus({ id: "nonexistent", status: "VIEWED" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("status SUBMITTED rejected by Zod", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    // @ts-expect-error intentionally invalid status
    await expect(caller.updateStatus({ id: "app-1", status: "SUBMITTED" })).rejects.toThrow();
  });

  it("status RESPONDED rejected by Zod (removed from schema)", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    // @ts-expect-error intentionally invalid status
    await expect(caller.updateStatus({ id: "app-1", status: "RESPONDED" })).rejects.toThrow();
  });
});
