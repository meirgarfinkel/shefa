import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { conversationRouter } from "../conversation";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockPrisma() {
  return {
    seekerProfile: { findUnique: vi.fn() },
    employerProfile: { findUnique: vi.fn() },
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
const EMPLOYER_PROFILE_ID = "ep-1";

const ACTIVE_SEEKER_PROFILE = { userId: SEEKER_USER_ID, status: "ACTIVE" };
const EMPLOYER_PROFILE = { userId: EMPLOYER_USER_ID };

const ACTIVE_JOB = { id: "job-1", postedById: EMPLOYER_USER_ID, status: "ACTIVE" };

const CONV = {
  id: "conv-1",
  participantAId: EMPLOYER_USER_ID,
  participantBId: SEEKER_USER_ID,
  jobId: null,
  initiatedById: EMPLOYER_USER_ID,
  lastMessageAt: null,
  lastMessagePreview: null,
  aBlockedB: false,
  bBlockedA: false,
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

    const result = await caller.create({ targetProfileId: SEEKER_PROFILE_ID });

    expect(result).toEqual(CONV);
    expect(mockPrisma.conversation.create).toHaveBeenCalledOnce();
  });

  it("employer creates conversation linked to a specific job", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.conversation.findFirst.mockResolvedValue(null);
    mockPrisma.conversation.create.mockResolvedValue({ ...CONV, jobId: "job-1" });

    const result = await caller.create({ targetProfileId: SEEKER_PROFILE_ID, jobId: "job-1" });

    expect(result).toMatchObject({ jobId: "job-1" });
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ jobId: "job-1" }) }),
    );
  });

  it("employer calling create again for same pair+job returns existing conversation", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockPrisma.conversation.findFirst.mockResolvedValue(CONV);

    const result = await caller.create({ targetProfileId: SEEKER_PROFILE_ID });

    expect(result).toEqual(CONV);
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
  });

  // ── SEEKER happy paths ──

  it("seeker creates conversation with employer after applying to their job", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.employerProfile.findUnique.mockResolvedValue(EMPLOYER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.findFirst.mockResolvedValue({ id: "app-1" });
    mockPrisma.conversation.findFirst.mockResolvedValue(null);
    mockPrisma.conversation.create.mockResolvedValue({
      ...CONV,
      participantAId: SEEKER_USER_ID,
      participantBId: EMPLOYER_USER_ID,
    });

    const result = await caller.create({ targetProfileId: EMPLOYER_PROFILE_ID, jobId: "job-1" });

    expect(result).toBeDefined();
    expect(mockPrisma.conversation.create).toHaveBeenCalledOnce();
  });

  it("seeker calling create again for same pair+job returns existing conversation", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.employerProfile.findUnique.mockResolvedValue(EMPLOYER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.findFirst.mockResolvedValue({ id: "app-1" });
    mockPrisma.conversation.findFirst.mockResolvedValue(CONV);

    const result = await caller.create({ targetProfileId: EMPLOYER_PROFILE_ID, jobId: "job-1" });

    expect(result).toEqual(CONV);
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
  });

  // ── SEEKER adversarial ──

  it("seeker without jobId → BAD_REQUEST", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));

    await expect(caller.create({ targetProfileId: EMPLOYER_PROFILE_ID })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("seeker targeting non-existent employer profile → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.employerProfile.findUnique.mockResolvedValue(null);

    await expect(
      caller.create({ targetProfileId: "ghost-profile", jobId: "job-1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("seeker with jobId they haven't applied to → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.employerProfile.findUnique.mockResolvedValue(EMPLOYER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(ACTIVE_JOB);
    mockPrisma.application.findFirst.mockResolvedValue(null);

    await expect(
      caller.create({ targetProfileId: EMPLOYER_PROFILE_ID, jobId: "job-1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("seeker with jobId belonging to a different employer → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.employerProfile.findUnique.mockResolvedValue(EMPLOYER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue({
      ...ACTIVE_JOB,
      postedById: "other-employer",
    });

    await expect(
      caller.create({ targetProfileId: EMPLOYER_PROFILE_ID, jobId: "job-1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("seeker targeting non-existent job → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.employerProfile.findUnique.mockResolvedValue(EMPLOYER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue(null);

    await expect(
      caller.create({ targetProfileId: EMPLOYER_PROFILE_ID, jobId: "job-1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  // ── EMPLOYER adversarial ──

  it("employer targeting non-existent seeker profile → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(null);

    await expect(caller.create({ targetProfileId: "ghost-profile" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("employer targeting seeker with PAUSED profile → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue({
      userId: SEEKER_USER_ID,
      status: "PAUSED",
    });

    await expect(caller.create({ targetProfileId: SEEKER_PROFILE_ID })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("resolved profile userId matches caller → BAD_REQUEST", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    // Artificial scenario: seekerProfile.userId accidentally equals the caller's userId
    mockPrisma.seekerProfile.findUnique.mockResolvedValue({
      userId: EMPLOYER_USER_ID,
      status: "ACTIVE",
    });
    mockPrisma.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.create({ targetProfileId: SEEKER_PROFILE_ID })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("employer's jobId belongs to a different employer → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.seekerProfile.findUnique.mockResolvedValue(ACTIVE_SEEKER_PROFILE);
    mockPrisma.jobPosting.findUnique.mockResolvedValue({ ...ACTIVE_JOB, postedById: "other" });

    await expect(
      caller.create({ targetProfileId: SEEKER_PROFILE_ID, jobId: "job-1" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  // ── Auth ──

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.create({ targetProfileId: SEEKER_PROFILE_ID })).rejects.toMatchObject({
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

  it("queries only conversations where caller is participantA or participantB", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, "user-42"));
    mockPrisma.conversation.findMany.mockResolvedValue([]);

    await caller.list();

    expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ participantAId: "user-42" }, { participantBId: "user-42" }],
        },
      }),
    );
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("includes participant profiles, job info, and unread message count", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.conversation.findMany.mockResolvedValue([]);

    await caller.list();

    const callArg = mockPrisma.conversation.findMany.mock.calls[0][0] as {
      include: Record<string, unknown>;
    };
    expect(callArg.include).toBeDefined();

    const inc = callArg.include as {
      participantA: { select: Record<string, unknown> };
      participantB: { select: Record<string, unknown> };
      job: unknown;
      _count: unknown;
    };
    expect(inc.participantA.select).toMatchObject({
      seekerProfile: expect.anything(),
      employerProfile: expect.anything(),
    });
    expect(inc.participantB.select).toMatchObject({
      seekerProfile: expect.anything(),
      employerProfile: expect.anything(),
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

  it("happy path: participant A fetches conversation with messages", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    const convWithMessages = { ...CONV, messages: [{ id: "msg-1", body: "hi" }] };
    mockPrisma.conversation.findUnique.mockResolvedValue(convWithMessages);

    const result = await caller.get({ conversationId: "conv-1" });

    expect(result).toEqual(convWithMessages);
  });

  it("happy path: participant B can also fetch", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue({ ...CONV, messages: [] });

    await expect(caller.get({ conversationId: "conv-1" })).resolves.toBeDefined();
  });

  it("conversation not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(null);

    await expect(caller.get({ conversationId: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("caller is not a participant → NOT_FOUND (does not leak existence)", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "outsider"));
    // findUnique scoped to caller's participation, so returns null for non-participants
    mockPrisma.conversation.findUnique.mockResolvedValue(null);

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

  it("includes participant profiles and job info in the query", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue({ ...CONV, messages: [] });

    await caller.get({ conversationId: "conv-1" });

    const callArg = mockPrisma.conversation.findUnique.mock.calls[0][0] as {
      include: Record<string, unknown>;
    };
    expect(callArg.include).toBeDefined();

    const inc = callArg.include as {
      messages: unknown;
      participantA: { select: Record<string, unknown> };
      participantB: { select: Record<string, unknown> };
      job: unknown;
    };
    expect(inc.messages).toBeDefined();
    expect(inc.participantA.select).toMatchObject({
      seekerProfile: expect.anything(),
      employerProfile: expect.anything(),
    });
    expect(inc.participantB.select).toMatchObject({
      seekerProfile: expect.anything(),
      employerProfile: expect.anything(),
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

  it("happy path: marks messages sent by the other participant as read", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(CONV);
    mockPrisma.message.updateMany.mockResolvedValue({ count: 3 });

    await caller.markRead({ conversationId: "conv-1" });

    // Caller is EMPLOYER_USER_ID (participantA). Other sender = SEEKER_USER_ID (participantB).
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

  it("does not mark caller's own outgoing messages as read", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(CONV);
    mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });

    await caller.markRead({ conversationId: "conv-1" });

    // Caller is SEEKER_USER_ID (participantB). Other sender = EMPLOYER_USER_ID (participantA).
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
    mockPrisma.conversation.findUnique.mockResolvedValue(null);

    await expect(caller.markRead({ conversationId: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("caller is not a participant → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "outsider"));
    mockPrisma.conversation.findUnique.mockResolvedValue(CONV);

    await expect(caller.markRead({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
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

  it("participantA blocks → sets aBlockedB = true", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(CONV);
    mockPrisma.conversation.update.mockResolvedValue({ ...CONV, aBlockedB: true });

    await caller.block({ conversationId: "conv-1" });

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { aBlockedB: true } }),
    );
  });

  it("participantB blocks → sets bBlockedA = true", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(CONV);
    mockPrisma.conversation.update.mockResolvedValue({ ...CONV, bBlockedA: true });

    await caller.block({ conversationId: "conv-1" });

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { bBlockedA: true } }),
    );
  });

  it("re-blocking an already-blocked conversation is a no-op (no error)", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue({ ...CONV, aBlockedB: true });
    mockPrisma.conversation.update.mockResolvedValue({ ...CONV, aBlockedB: true });

    await expect(caller.block({ conversationId: "conv-1" })).resolves.not.toThrow();
  });

  it("caller not in conversation → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "outsider"));
    mockPrisma.conversation.findUnique.mockResolvedValue(CONV);

    await expect(caller.block({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("conversation not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(null);

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

  it("participantA unblocks → sets aBlockedB = false", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_USER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue({ ...CONV, aBlockedB: true });
    mockPrisma.conversation.update.mockResolvedValue({ ...CONV, aBlockedB: false });

    await caller.unblock({ conversationId: "conv-1" });

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { aBlockedB: false } }),
    );
  });

  it("participantB unblocks → sets bBlockedA = false", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_USER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue({ ...CONV, bBlockedA: true });
    mockPrisma.conversation.update.mockResolvedValue({ ...CONV, bBlockedA: false });

    await caller.unblock({ conversationId: "conv-1" });

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { bBlockedA: false } }),
    );
  });

  it("caller not in conversation → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "outsider"));
    mockPrisma.conversation.findUnique.mockResolvedValue(CONV);

    await expect(caller.unblock({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.unblock({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
