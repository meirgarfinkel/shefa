import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { conversationRouter } from "../conversation";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockPrisma() {
  return {
    seekerProfile: { findUnique: vi.fn() },
    jobPosting: { findUnique: vi.fn() },
    application: { findFirst: vi.fn() },
    conversation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: { updateMany: vi.fn() },
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
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  // ── EMPLOYER happy paths ──

  it("employer cold-DM: creates conversation with active seeker", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockPrisma.conversation.findFirst.mockResolvedValue(null);
    mockPrisma.conversation.create.mockResolvedValue(CONV);

    const result = await caller.create({ targetId: SEEKER_PROFILE_ID });

    expect(result).toEqual(CONV);
    expect(mockPrisma.conversation.create).toHaveBeenCalledOnce();
  });

  it("employer creates conversation linked to a specific job", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.conversation.findFirst.mockResolvedValue(null);
    mockPrisma.conversation.create.mockResolvedValue({ ...CONV, jobId: "job-1" });

    const result = await caller.create({ targetId: SEEKER_PROFILE_ID, jobId: "job-1" });

    expect(result).toMatchObject({ jobId: "job-1" });
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ jobId: "job-1" }) }),
    );
  });

  it("employer cold-DM sets seekerId to seeker's userId and employerId to caller", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockPrisma.conversation.findFirst.mockResolvedValue(null);
    mockPrisma.conversation.create.mockResolvedValue(CONV);

    await caller.create({ targetId: SEEKER_PROFILE_ID });

    expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          seekerId: SEEKER_USER_ID,
          employerId: EMPLOYER_USER_ID,
        }),
      }),
    );
  });

  it("employer calling create again for same pair+job returns existing conversation", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockPrisma.conversation.findFirst.mockResolvedValue(CONV);

    const result = await caller.create({ targetId: SEEKER_PROFILE_ID });

    expect(result).toEqual(CONV);
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
  });

  // ── SEEKER happy paths ──

  it("seeker creates conversation with employer after applying to their job", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.findFirst.mockResolvedValue({ id: "app-1" });
    mockPrisma.conversation.findFirst.mockResolvedValue(null);
    mockPrisma.conversation.create.mockResolvedValue(CONV);

    const result = await caller.create({ targetId: EMPLOYER_USER_ID, jobId: "job-1" });

    expect(result).toBeDefined();
    expect(mockPrisma.conversation.create).toHaveBeenCalledOnce();
  });

  it("seeker create sets seekerId to caller and employerId to targetId", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.findFirst.mockResolvedValue({ id: "app-1" });
    mockPrisma.conversation.findFirst.mockResolvedValue(null);
    mockPrisma.conversation.create.mockResolvedValue(CONV);

    await caller.create({ targetId: EMPLOYER_USER_ID, jobId: "job-1" });

    expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          seekerId: SEEKER_USER_ID,
          employerId: EMPLOYER_USER_ID,
        }),
      }),
    );
  });

  it("seeker calling create again for same pair+job returns existing conversation", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.findFirst.mockResolvedValue({ id: "app-1" });
    mockPrisma.conversation.findFirst.mockResolvedValue(CONV);

    const result = await caller.create({ targetId: EMPLOYER_USER_ID, jobId: "job-1" });

    expect(result).toEqual(CONV);
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
  });

  // ── SEEKER adversarial ──

  it("seeker without jobId → BAD_REQUEST", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));

    await expect(caller.create({ targetId: EMPLOYER_USER_ID })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("seeker targeting non-existent job → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.jobPosting.findUnique.mockResolvedValue(null);

    await expect(
      caller.create({ targetId: EMPLOYER_USER_ID, jobId: "ghost-job" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("seeker with jobId they haven't applied to → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.findFirst.mockResolvedValue(null);

    await expect(
      caller.create({ targetId: EMPLOYER_USER_ID, jobId: "job-1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("seeker with jobId belonging to a different employer → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.jobPosting.findUnique.mockResolvedValue({
      ...ACTIVE_JOB,
      employerId: "other-employer",
    });

    await expect(
      caller.create({ targetId: EMPLOYER_USER_ID, jobId: "job-1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  // ── EMPLOYER adversarial ──

  it("employer targeting non-existent seeker profile → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(null);

    await expect(caller.create({ targetId: "ghost-profile" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("employer targeting seeker with PAUSED profile → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue({
      userId: SEEKER_USER_ID,
      status: "PAUSED",
    });

    await expect(caller.create({ targetId: SEEKER_PROFILE_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("resolved seekerProfile.userId matches caller → BAD_REQUEST", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    // seekerProfile.userId accidentally equals the caller's userId
    mockPrisma.seekerProfile.findUnique.mockResolvedValue({
      userId: EMPLOYER_USER_ID,
      status: "ACTIVE",
    });
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.create({ targetId: SEEKER_PROFILE_ID })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("employer's jobId belongs to a different employer → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue({ ...ACTIVE_JOB, employerId: "other" });

    await expect(
      caller.create({ targetId: SEEKER_PROFILE_ID, jobId: "job-1" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  // ── Auth ──

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.create({ targetId: SEEKER_PROFILE_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ── conversation.list ──────────────────────────────────────────────────────────

describe("list", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("happy path: returns caller's conversations sorted by lastMessageAt desc", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    const convs = [
      { ...CONV, id: "conv-1" },
      { ...CONV, id: "conv-2" },
    ];
    mockPrisma.conversation.findMany.mockResolvedValue(convs);

    const result = await caller.list();

    expect(result).toEqual(convs);
  });

  it("returns empty array when no conversations", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.conversation.findMany.mockResolvedValue([]);

    expect(await caller.list()).toEqual([]);
  });

  it("seeker list: queries by seekerId only", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, "user-42"));
    mockPrisma.conversation.findMany.mockResolvedValue([]);

    await caller.list();

    expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { seekerId: "user-42" },
      }),
    );
  });

  it("employer list: queries by employerId only", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "user-42"));
    mockPrisma.conversation.findMany.mockResolvedValue([]);

    await caller.list();

    expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { employerId: "user-42" },
      }),
    );
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("includes seeker + employer profiles, job info, and unread count", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.conversation.findMany.mockResolvedValue([]);

    await caller.list();

    const callArg = mockPrisma.conversation.findMany.mock.calls[0][0] as {
      include: Record<string, unknown>;
    };
    expect(callArg.include).toBeDefined();

    const inc = callArg.include as {
      seeker: { select: Record<string, unknown> };
      employer: { select: Record<string, unknown> };
      job: unknown;
      _count: unknown;
    };
    expect(inc.seeker.select).toMatchObject({
      seekerProfile: expect.anything(),
      companies: expect.anything(),
    });
    expect(inc.employer.select).toMatchObject({
      seekerProfile: expect.anything(),
      companies: expect.anything(),
    });
    expect(inc.job).toBeDefined();
    expect(inc._count).toBeDefined();
  });
});

// ── conversation.get ───────────────────────────────────────────────────────────

describe("get", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("happy path: employer fetches conversation with messages", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    const convWithMessages = { ...CONV, messages: [{ id: "msg-1", body: "hi" }] };
    mockPrisma.conversation.findFirst.mockResolvedValue(convWithMessages);

    const result = await caller.get({ conversationId: "conv-1" });

    expect(result).toEqual(convWithMessages);
  });

  it("happy path: seeker can also fetch", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.conversation.findFirst.mockResolvedValue({ ...CONV, messages: [] });

    await expect(caller.get({ conversationId: "conv-1" })).resolves.toBeDefined();
  });

  it("conversation not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.get({ conversationId: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("caller is not a participant → NOT_FOUND (does not leak existence)", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "outsider"));
    // findFirst scoped to caller's participation returns null for non-participants
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.get({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.get({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("includes seeker + employer profiles and job info", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findFirst.mockResolvedValue({ ...CONV, messages: [] });

    await caller.get({ conversationId: "conv-1" });

    const callArg = mockPrisma.conversation.findFirst.mock.calls[0][0] as {
      include: Record<string, unknown>;
    };
    expect(callArg.include).toBeDefined();

    const inc = callArg.include as {
      messages: unknown;
      seeker: { select: Record<string, unknown> };
      employer: { select: Record<string, unknown> };
      job: unknown;
    };
    expect(inc.messages).toBeDefined();
    expect(inc.seeker.select).toMatchObject({
      seekerProfile: expect.anything(),
      companies: expect.anything(),
    });
    expect(inc.employer.select).toMatchObject({
      seekerProfile: expect.anything(),
      companies: expect.anything(),
    });
    expect(inc.job).toBeDefined();
  });
});

// ── conversation.markRead ──────────────────────────────────────────────────────

describe("markRead", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("happy path: employer marks seeker's messages as read", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findFirst.mockResolvedValue(CONV);
    mockPrisma.message.updateMany.mockResolvedValue({ count: 3 });

    await caller.markRead({ conversationId: "conv-1" });

    // Caller is employer → otherId is seeker
    expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversationId: "conv-1",
          senderId: SEEKER_USER_ID,
          readAt: null,
        }),
      }),
    );
  });

  it("seeker marks employer's messages as read", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.conversation.findFirst.mockResolvedValue(CONV);
    mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });

    await caller.markRead({ conversationId: "conv-1" });

    // Caller is seeker → otherId is employer
    expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ senderId: EMPLOYER_USER_ID }),
      }),
    );
    expect(mockPrisma.message.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ senderId: SEEKER_USER_ID }),
      }),
    );
  });

  it("conversation not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.markRead({ conversationId: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("caller is not a participant → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "outsider"));
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.markRead({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.markRead({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ── conversation.block ─────────────────────────────────────────────────────────

describe("block", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("employer blocks → sets employerBlocked = true", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findFirst.mockResolvedValue(CONV);
    mockPrisma.conversation.update.mockResolvedValue({ ...CONV, employerBlocked: true });

    await caller.block({ conversationId: "conv-1" });

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { employerBlocked: true } }),
    );
  });

  it("seeker blocks → sets seekerBlocked = true", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.conversation.findFirst.mockResolvedValue(CONV);
    mockPrisma.conversation.update.mockResolvedValue({ ...CONV, seekerBlocked: true });

    await caller.block({ conversationId: "conv-1" });

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { seekerBlocked: true } }),
    );
  });

  it("re-blocking an already-blocked conversation is a no-op (no error)", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findFirst.mockResolvedValue({ ...CONV, employerBlocked: true });
    mockPrisma.conversation.update.mockResolvedValue({ ...CONV, employerBlocked: true });

    await expect(caller.block({ conversationId: "conv-1" })).resolves.not.toThrow();
  });

  it("caller not in conversation → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "outsider"));
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.block({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("conversation not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.block({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.block({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ── conversation.unblock ───────────────────────────────────────────────────────

describe("unblock", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("employer unblocks → sets employerBlocked = false", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findFirst.mockResolvedValue({ ...CONV, employerBlocked: true });
    mockPrisma.conversation.update.mockResolvedValue({ ...CONV, employerBlocked: false });

    await caller.unblock({ conversationId: "conv-1" });

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { employerBlocked: false } }),
    );
  });

  it("seeker unblocks → sets seekerBlocked = false", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.conversation.findFirst.mockResolvedValue({ ...CONV, seekerBlocked: true });
    mockPrisma.conversation.update.mockResolvedValue({ ...CONV, seekerBlocked: false });

    await caller.unblock({ conversationId: "conv-1" });

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { seekerBlocked: false } }),
    );
  });

  it("caller not in conversation → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "outsider"));
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.unblock({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.unblock({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
