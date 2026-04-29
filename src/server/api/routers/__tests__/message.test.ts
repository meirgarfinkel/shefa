import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { messageRouter } from "../message";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/jobs/schedule-message-notify", () => ({
  scheduleMessageNotify: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockPrisma() {
  return {
    conversation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
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

const createCaller = createCallerFactory(messageRouter);

// ── Fixtures ───────────────────────────────────────────────────────────────────

const EMPLOYER_ID = "employer-1";
const SEEKER_ID = "seeker-1";

const OPEN_CONV = {
  id: "conv-1",
  participantAId: EMPLOYER_ID,
  participantBId: SEEKER_ID,
  aBlockedB: false,
  bBlockedA: false,
};

const CREATED_MESSAGE = {
  id: "msg-1",
  conversationId: "conv-1",
  senderId: EMPLOYER_ID,
  body: "Hello there",
  readAt: null,
  createdAt: new Date(),
};

// ── message.send ───────────────────────────────────────────────────────────────

describe("send", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("happy path: participantA sends message successfully", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);
    mockPrisma.message.create.mockResolvedValue(CREATED_MESSAGE);
    mockPrisma.conversation.update.mockResolvedValue({});

    const result = await caller.send({ conversationId: "conv-1", body: "Hello there" });

    expect(result).toEqual(CREATED_MESSAGE);
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: "conv-1",
          senderId: EMPLOYER_ID,
          body: "Hello there",
        }),
      }),
    );
  });

  it("happy path: participantB can also send", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);
    mockPrisma.message.create.mockResolvedValue({ ...CREATED_MESSAGE, senderId: SEEKER_ID });
    mockPrisma.conversation.update.mockResolvedValue({});

    await expect(caller.send({ conversationId: "conv-1", body: "Hi back" })).resolves.toBeDefined();
  });

  it("updates lastMessageAt and lastMessagePreview on the conversation", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);
    mockPrisma.message.create.mockResolvedValue(CREATED_MESSAGE);
    mockPrisma.conversation.update.mockResolvedValue({});

    await caller.send({ conversationId: "conv-1", body: "Hello there" });

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv-1" },
        data: expect.objectContaining({
          lastMessageAt: expect.any(Date),
          lastMessagePreview: "Hello there",
        }),
      }),
    );
  });

  it("lastMessagePreview is truncated to 100 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);
    mockPrisma.message.create.mockResolvedValue(CREATED_MESSAGE);
    mockPrisma.conversation.update.mockResolvedValue({});

    await caller.send({ conversationId: "conv-1", body: "a".repeat(200) });

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastMessagePreview: "a".repeat(100) }),
      }),
    );
  });

  it("body exactly 5000 chars is accepted", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);
    mockPrisma.message.create.mockResolvedValue(CREATED_MESSAGE);
    mockPrisma.conversation.update.mockResolvedValue({});

    await expect(
      caller.send({ conversationId: "conv-1", body: "a".repeat(5000) }),
    ).resolves.toBeDefined();
  });

  it("body 5001 chars → Zod validation error", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    await expect(
      caller.send({ conversationId: "conv-1", body: "a".repeat(5001) }),
    ).rejects.toThrow();
  });

  it("empty body → Zod validation error", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    await expect(caller.send({ conversationId: "conv-1", body: "" })).rejects.toThrow();
  });

  it("HTML injection in body is stored verbatim — no stripping", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    const xssBody = "<script>alert('xss')</script>";
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);
    mockPrisma.message.create.mockResolvedValue({ ...CREATED_MESSAGE, body: xssBody });
    mockPrisma.conversation.update.mockResolvedValue({});

    await caller.send({ conversationId: "conv-1", body: xssBody });

    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ body: xssBody }) }),
    );
  });

  it("conversationId not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(null);

    await expect(caller.send({ conversationId: "nonexistent", body: "hi" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("caller is not a participant → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "outsider"));
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);

    await expect(caller.send({ conversationId: "conv-1", body: "hi" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("aBlockedB = true and caller is participantA → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue({ ...OPEN_CONV, aBlockedB: true });

    await expect(caller.send({ conversationId: "conv-1", body: "hi" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("bBlockedA = true and caller is participantB → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue({ ...OPEN_CONV, bBlockedA: true });

    await expect(caller.send({ conversationId: "conv-1", body: "hi" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("participantB has blocked participantA (bBlockedA) → A cannot send either", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue({ ...OPEN_CONV, bBlockedA: true });

    await expect(caller.send({ conversationId: "conv-1", body: "hi" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("participantA has blocked participantB (aBlockedB) → B cannot send either", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue({ ...OPEN_CONV, aBlockedB: true });

    await expect(caller.send({ conversationId: "conv-1", body: "hi" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.send({ conversationId: "conv-1", body: "hi" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("scheduleMessageNotify called after successful send — caller is participantA, recipient is participantB", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);
    mockPrisma.message.create.mockResolvedValue(CREATED_MESSAGE);
    mockPrisma.conversation.update.mockResolvedValue({});

    await caller.send({ conversationId: "conv-1", body: "Hello" });

    const { scheduleMessageNotify } = await import("@/server/jobs/schedule-message-notify");
    expect(vi.mocked(scheduleMessageNotify)).toHaveBeenCalledWith("conv-1", SEEKER_ID);
  });

  it("scheduleMessageNotify called with recipientId = participantA when caller is participantB", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);
    mockPrisma.message.create.mockResolvedValue({ ...CREATED_MESSAGE, senderId: SEEKER_ID });
    mockPrisma.conversation.update.mockResolvedValue({});

    await caller.send({ conversationId: "conv-1", body: "Hi back" });

    const { scheduleMessageNotify } = await import("@/server/jobs/schedule-message-notify");
    expect(vi.mocked(scheduleMessageNotify)).toHaveBeenCalledWith("conv-1", EMPLOYER_ID);
  });

  it("scheduleMessageNotify failure does not propagate — message still returned", async () => {
    const { scheduleMessageNotify } = await import("@/server/jobs/schedule-message-notify");
    vi.mocked(scheduleMessageNotify).mockRejectedValueOnce(new Error("Redis down"));

    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);
    mockPrisma.message.create.mockResolvedValue(CREATED_MESSAGE);
    mockPrisma.conversation.update.mockResolvedValue({});

    await expect(caller.send({ conversationId: "conv-1", body: "Hello" })).resolves.toEqual(
      CREATED_MESSAGE,
    );
  });
});

// ── message.list ───────────────────────────────────────────────────────────────

describe("list", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
  });

  it("happy path: participant receives messages oldest-first", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);
    const msgs = [
      { id: "msg-1", body: "first", createdAt: new Date("2024-01-01") },
      { id: "msg-2", body: "second", createdAt: new Date("2024-01-02") },
    ];
    mockPrisma.message.findMany.mockResolvedValue(msgs);

    const result = await caller.list({ conversationId: "conv-1" });

    expect(result).toEqual(msgs);
    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "asc" } }),
    );
  });

  it("conversation with no messages returns empty array", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockPrisma, SEEKER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);
    mockPrisma.message.findMany.mockResolvedValue([]);

    expect(await caller.list({ conversationId: "conv-1" })).toEqual([]);
  });

  it("caller not a participant → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, "outsider"));
    mockPrisma.conversation.findUnique.mockResolvedValue(OPEN_CONV);

    await expect(caller.list({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("conversation not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockPrisma, EMPLOYER_ID));
    mockPrisma.conversation.findUnique.mockResolvedValue(null);

    await expect(caller.list({ conversationId: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockPrisma));
    await expect(caller.list({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
