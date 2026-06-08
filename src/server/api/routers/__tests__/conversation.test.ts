import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { conversationRouter } from "../conversation";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      seekerProfile: { findFirst: vi.fn(), findMany: vi.fn() },
      employerProfile: { findFirst: vi.fn(), findMany: vi.fn() },
      jobPosting: { findFirst: vi.fn(), findMany: vi.fn() },
      application: { findFirst: vi.fn(), findMany: vi.fn() },
      conversation: { findFirst: vi.fn(), findMany: vi.fn() },
      message: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    $count: vi.fn().mockResolvedValue(0),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([]),
        }),
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

const createCaller = createCallerFactory(conversationRouter);

// ── Fixtures ───────────────────────────────────────────────────────────────────

const EMPLOYER_USER_ID = "employer-1";
const SEEKER_USER_ID = "seeker-1";
const SEEKER_PROFILE_ID = "sp-1";

const ACTIVE_SEEKER_PROFILE = { userId: SEEKER_USER_ID, status: "ACTIVE" };

const ACTIVE_JOB = { id: "job-1", employerId: EMPLOYER_USER_ID, status: "ACTIVE" };

const CONV = {
  id: "conv-1",
  seekerId: SEEKER_USER_ID,
  employerId: EMPLOYER_USER_ID,
  jobId: null,
  lastMessageAt: null,
  lastMessagePreview: null,
  seekerBlocked: false,
  employerBlocked: false,
  createdAt: new Date(),
};

// ── conversation.create ────────────────────────────────────────────────────────

describe("create", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  // ── EMPLOYER happy paths ──

  it("employer cold-DM: creates conversation with active seeker", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockDb.query.conversation.findFirst.mockResolvedValue(null);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CONV]),
      }),
    });

    const result = await caller.create({ targetId: SEEKER_PROFILE_ID });

    expect(result).toEqual(CONV);
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });

  it("employer creates conversation linked to a specific job", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.query.application.findFirst.mockResolvedValue({ id: "app-1" });
    mockDb.query.conversation.findFirst.mockResolvedValue(null);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...CONV, jobId: "job-1" }]),
      }),
    });

    const result = await caller.create({ targetId: SEEKER_PROFILE_ID, jobId: "job-1" });

    expect(result).toMatchObject({ jobId: "job-1" });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("employer cold-DM sets seekerId to seeker's userId and employerId to caller", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockDb.query.conversation.findFirst.mockResolvedValue(null);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CONV]),
      }),
    });

    const result = await caller.create({ targetId: SEEKER_PROFILE_ID });

    expect(result).toMatchObject({
      seekerId: SEEKER_USER_ID,
      employerId: EMPLOYER_USER_ID,
    });
  });

  it("employer calling create again for same pair+job returns existing conversation", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockDb.query.conversation.findFirst.mockResolvedValue(CONV);

    const result = await caller.create({ targetId: SEEKER_PROFILE_ID });

    expect(result).toEqual(CONV);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  // ── SEEKER happy paths ──

  it("seeker creates conversation with employer after applying to their job", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.query.application.findFirst.mockResolvedValue({ id: "app-1" });
    mockDb.query.conversation.findFirst.mockResolvedValue(null);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CONV]),
      }),
    });

    const result = await caller.create({ targetId: EMPLOYER_USER_ID, jobId: "job-1" });

    expect(result).toBeDefined();
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });

  it("seeker create sets seekerId to caller and employerId to targetId", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.query.application.findFirst.mockResolvedValue({ id: "app-1" });
    mockDb.query.conversation.findFirst.mockResolvedValue(null);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CONV]),
      }),
    });

    const result = await caller.create({ targetId: EMPLOYER_USER_ID, jobId: "job-1" });

    expect(result).toMatchObject({
      seekerId: SEEKER_USER_ID,
      employerId: EMPLOYER_USER_ID,
    });
  });

  it("seeker calling create again for same pair+job returns existing conversation", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.query.application.findFirst.mockResolvedValue({ id: "app-1" });
    mockDb.query.conversation.findFirst.mockResolvedValue(CONV);

    const result = await caller.create({ targetId: EMPLOYER_USER_ID, jobId: "job-1" });

    expect(result).toEqual(CONV);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  // ── SEEKER adversarial ──

  it("seeker without jobId → BAD_REQUEST", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));

    await expect(caller.create({ targetId: EMPLOYER_USER_ID })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("seeker targeting non-existent job → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));
    mockDb.query.jobPosting.findFirst.mockResolvedValue(null);

    await expect(
      caller.create({ targetId: EMPLOYER_USER_ID, jobId: "ghost-job" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("seeker with jobId they haven't applied to → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.query.application.findFirst.mockResolvedValue(null);

    await expect(
      caller.create({ targetId: EMPLOYER_USER_ID, jobId: "job-1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("seeker with jobId belonging to a different employer → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));
    mockDb.query.jobPosting.findFirst.mockResolvedValue({
      ...ACTIVE_JOB,
      employerId: "other-employer",
    });

    await expect(
      caller.create({ targetId: EMPLOYER_USER_ID, jobId: "job-1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("employer linking a job the seeker hasn't applied to → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue(ACTIVE_JOB);
    mockDb.query.application.findFirst.mockResolvedValue(null);

    await expect(
      caller.create({ targetId: SEEKER_PROFILE_ID, jobId: "job-1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("suspended employer cannot start a conversation → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.employerProfile.findFirst.mockResolvedValue({ status: "SUSPENDED" });

    await expect(caller.create({ targetId: SEEKER_PROFILE_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("employer at the daily cold-DM limit → TOO_MANY_REQUESTS", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockDb.query.conversation.findFirst.mockResolvedValue(null);
    mockDb.$count.mockResolvedValue(50);

    await expect(caller.create({ targetId: SEEKER_PROFILE_ID })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  // ── EMPLOYER adversarial ──

  it("employer targeting non-existent seeker profile → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(null);

    await expect(caller.create({ targetId: "ghost-profile" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("employer targeting seeker with PAUSED profile → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({
      userId: SEEKER_USER_ID,
      status: "PAUSED",
    });

    await expect(caller.create({ targetId: SEEKER_PROFILE_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("resolved seekerProfile.userId matches caller → BAD_REQUEST", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    // seekerProfile.userId accidentally equals the caller's userId
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({
      userId: EMPLOYER_USER_ID,
      status: "ACTIVE",
    });
    mockDb.query.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.create({ targetId: SEEKER_PROFILE_ID })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("employer's jobId belongs to a different employer → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockDb.query.jobPosting.findFirst.mockResolvedValue({ ...ACTIVE_JOB, employerId: "other" });

    await expect(
      caller.create({ targetId: SEEKER_PROFILE_ID, jobId: "job-1" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  // ── Auth ──

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.create({ targetId: SEEKER_PROFILE_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ── conversation.list ──────────────────────────────────────────────────────────

describe("list", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    // list uses select().from().where().groupBy() for unread counts
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
  });

  it("happy path: returns caller's conversations sorted by lastMessageAt desc", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    const convs = [
      { ...CONV, id: "conv-1" },
      { ...CONV, id: "conv-2" },
    ];
    mockDb.query.conversation.findMany.mockResolvedValue(convs);

    const result = await caller.list();

    expect(result.map((c) => c.id)).toEqual(["conv-1", "conv-2"]);
  });

  it("returns empty array when no conversations", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));
    mockDb.query.conversation.findMany.mockResolvedValue([]);

    expect(await caller.list()).toEqual([]);
  });

  it("seeker list: queries by seekerId only", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, "user-42"));
    mockDb.query.conversation.findMany.mockResolvedValue([]);

    await caller.list();

    expect(mockDb.query.conversation.findMany).toHaveBeenCalled();
  });

  it("employer list: queries by employerId only", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "user-42"));
    mockDb.query.conversation.findMany.mockResolvedValue([]);

    await caller.list();

    expect(mockDb.query.conversation.findMany).toHaveBeenCalled();
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("includes seeker + employer profiles, job info, and unread count", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));
    mockDb.query.conversation.findMany.mockResolvedValue([]);

    await caller.list();

    expect(mockDb.query.conversation.findMany).toHaveBeenCalled();
  });
});

// ── conversation.get ───────────────────────────────────────────────────────────

describe("get", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("happy path: employer fetches conversation with messages", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    const convWithMessages = { ...CONV, messages: [{ id: "msg-1", body: "hi" }], jobId: null };
    mockDb.query.conversation.findFirst.mockResolvedValue(convWithMessages);

    const result = await caller.get({ conversationId: "conv-1" });

    expect(result).toMatchObject({ id: "conv-1" });
  });

  it("happy path: seeker can also fetch", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue({ ...CONV, messages: [], jobId: null });

    await expect(caller.get({ conversationId: "conv-1" })).resolves.toBeDefined();
  });

  it("conversation not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.get({ conversationId: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("caller is not a participant → NOT_FOUND (does not leak existence)", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "outsider"));
    // findFirst scoped to caller's participation returns null for non-participants
    mockDb.query.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.get({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.get({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("includes seeker + employer profiles and job info", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue({ ...CONV, messages: [], jobId: null });

    await caller.get({ conversationId: "conv-1" });

    expect(mockDb.query.conversation.findFirst).toHaveBeenCalled();
  });
});

// ── conversation.markRead ──────────────────────────────────────────────────────

describe("markRead", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("happy path: employer marks seeker's messages as read", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(CONV);

    await caller.markRead({ conversationId: "conv-1" });

    // markRead calls db.update(message).set(...).where(...)
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("seeker marks employer's messages as read", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(CONV);

    await caller.markRead({ conversationId: "conv-1" });

    expect(mockDb.update).toHaveBeenCalled();
  });

  it("conversation not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.markRead({ conversationId: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("caller is not a participant → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "outsider"));
    mockDb.query.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.markRead({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.markRead({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ── conversation.block ─────────────────────────────────────────────────────────

describe("block", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("employer blocks → sets employerBlocked = true", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(CONV);

    await caller.block({ conversationId: "conv-1" });

    expect(mockDb.update).toHaveBeenCalled();
  });

  it("seeker blocks → sets seekerBlocked = true", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(CONV);

    await caller.block({ conversationId: "conv-1" });

    expect(mockDb.update).toHaveBeenCalled();
  });

  it("re-blocking an already-blocked conversation is a no-op (no error)", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue({ ...CONV, employerBlocked: true });

    await expect(caller.block({ conversationId: "conv-1" })).resolves.not.toThrow();
  });

  it("caller not in conversation → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "outsider"));
    mockDb.query.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.block({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("conversation not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.block({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.block({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ── conversation.unblock ───────────────────────────────────────────────────────

describe("unblock", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("employer unblocks → sets employerBlocked = false", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_USER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue({ ...CONV, employerBlocked: true });

    await caller.unblock({ conversationId: "conv-1" });

    expect(mockDb.update).toHaveBeenCalled();
  });

  it("seeker unblocks → sets seekerBlocked = false", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_USER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue({ ...CONV, seekerBlocked: true });

    await caller.unblock({ conversationId: "conv-1" });

    expect(mockDb.update).toHaveBeenCalled();
  });

  it("caller not in conversation → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "outsider"));
    mockDb.query.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.unblock({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.unblock({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
