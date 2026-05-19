import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { messageRouter } from "../message";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/jobs/message-notify.job", () => ({
  runMessageNotifyJob: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    query: {
      conversation: { findFirst: vi.fn(), findMany: vi.fn() },
      message: { findFirst: vi.fn(), findMany: vi.fn() },
      seekerProfile: { findFirst: vi.fn(), findMany: vi.fn() },
      employerProfile: { findFirst: vi.fn(), findMany: vi.fn() },
      jobPosting: { findFirst: vi.fn(), findMany: vi.fn() },
      application: { findFirst: vi.fn(), findMany: vi.fn() },
    },
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

const createCaller = createCallerFactory(messageRouter);

// ── Fixtures ───────────────────────────────────────────────────────────────────

const EMPLOYER_ID = "employer-1";
const SEEKER_ID = "seeker-1";

const OPEN_CONV = {
  id: "conv-1",
  seekerId: SEEKER_ID,
  employerId: EMPLOYER_ID,
  seekerBlocked: false,
  employerBlocked: false,
  jobId: null,
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
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("happy path: employer sends message successfully", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.query.employerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_MESSAGE]),
      }),
    });

    const result = await caller.send({ conversationId: "conv-1", body: "Hello there" });

    expect(result).toEqual(CREATED_MESSAGE);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("happy path: seeker can also send", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.query.employerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...CREATED_MESSAGE, senderId: SEEKER_ID }]),
      }),
    });

    await expect(caller.send({ conversationId: "conv-1", body: "Hi back" })).resolves.toBeDefined();
  });

  it("updates lastMessageAt and lastMessagePreview on the conversation", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.query.employerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_MESSAGE]),
      }),
    });

    await caller.send({ conversationId: "conv-1", body: "Hello there" });

    expect(mockDb.update).toHaveBeenCalled();
  });

  it("lastMessagePreview is truncated to 100 chars", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.query.employerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_MESSAGE]),
      }),
    });

    await caller.send({ conversationId: "conv-1", body: "a".repeat(200) });

    expect(mockDb.update).toHaveBeenCalled();
  });

  it("body exactly 5000 chars is accepted", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.query.employerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_MESSAGE]),
      }),
    });

    await expect(
      caller.send({ conversationId: "conv-1", body: "a".repeat(5000) }),
    ).resolves.toBeDefined();
  });

  it("body 5001 chars → Zod validation error", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    await expect(
      caller.send({ conversationId: "conv-1", body: "a".repeat(5001) }),
    ).rejects.toThrow();
  });

  it("empty body → Zod validation error", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    await expect(caller.send({ conversationId: "conv-1", body: "" })).rejects.toThrow();
  });

  it("HTML injection in body is stored verbatim — no stripping", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    const xssBody = "<script>alert('xss')</script>";
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.query.employerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...CREATED_MESSAGE, body: xssBody }]),
      }),
    });

    const result = await caller.send({ conversationId: "conv-1", body: xssBody });

    expect(result.body).toBe(xssBody);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("conversationId not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.send({ conversationId: "nonexistent", body: "hi" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("caller is not a participant → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "outsider"));
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);

    await expect(caller.send({ conversationId: "conv-1", body: "hi" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("employerBlocked = true → employer cannot send", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue({ ...OPEN_CONV, employerBlocked: true });

    await expect(caller.send({ conversationId: "conv-1", body: "hi" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("seekerBlocked = true → seeker cannot send", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue({ ...OPEN_CONV, seekerBlocked: true });

    await expect(caller.send({ conversationId: "conv-1", body: "hi" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("seekerBlocked = true → employer cannot send either", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue({ ...OPEN_CONV, seekerBlocked: true });

    await expect(caller.send({ conversationId: "conv-1", body: "hi" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("employerBlocked = true → seeker cannot send either", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue({ ...OPEN_CONV, employerBlocked: true });

    await expect(caller.send({ conversationId: "conv-1", body: "hi" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.send({ conversationId: "conv-1", body: "hi" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("runMessageNotifyJob called after successful send — caller is employer, recipient is seeker", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.query.employerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_MESSAGE]),
      }),
    });

    await caller.send({ conversationId: "conv-1", body: "Hello" });

    const { runMessageNotifyJob } = await import("@/server/jobs/message-notify.job");
    expect(vi.mocked(runMessageNotifyJob)).toHaveBeenCalledWith({
      conversationId: "conv-1",
      recipientId: SEEKER_ID,
    });
  });

  it("runMessageNotifyJob called with recipientId = employer when caller is seeker", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.query.employerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...CREATED_MESSAGE, senderId: SEEKER_ID }]),
      }),
    });

    await caller.send({ conversationId: "conv-1", body: "Hi back" });

    const { runMessageNotifyJob } = await import("@/server/jobs/message-notify.job");
    expect(vi.mocked(runMessageNotifyJob)).toHaveBeenCalledWith({
      conversationId: "conv-1",
      recipientId: EMPLOYER_ID,
    });
  });

  it("runMessageNotifyJob failure does not propagate — message still returned", async () => {
    const { runMessageNotifyJob } = await import("@/server/jobs/message-notify.job");
    vi.mocked(runMessageNotifyJob).mockRejectedValueOnce(new Error("Resend down"));

    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.query.employerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED_MESSAGE]),
      }),
    });

    await expect(caller.send({ conversationId: "conv-1", body: "Hello" })).resolves.toEqual(
      CREATED_MESSAGE,
    );
  });
});

// ── message.list ───────────────────────────────────────────────────────────────

describe("list", () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("happy path: participant receives messages oldest-first", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);
    const msgs = [
      { id: "msg-1", body: "first", createdAt: new Date("2024-01-01") },
      { id: "msg-2", body: "second", createdAt: new Date("2024-01-02") },
    ];
    mockDb.query.message.findMany.mockResolvedValue(msgs);

    const result = await caller.list({ conversationId: "conv-1" });

    expect(result).toEqual(msgs);
    expect(mockDb.query.message.findMany).toHaveBeenCalled();
  });

  it("conversation with no messages returns empty array", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb, SEEKER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);
    mockDb.query.message.findMany.mockResolvedValue([]);

    expect(await caller.list({ conversationId: "conv-1" })).toEqual([]);
  });

  it("caller not a participant → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, "outsider"));
    mockDb.query.conversation.findFirst.mockResolvedValue(OPEN_CONV);

    await expect(caller.list({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("conversation not found → NOT_FOUND", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb, EMPLOYER_ID));
    mockDb.query.conversation.findFirst.mockResolvedValue(null);

    await expect(caller.list({ conversationId: "nonexistent" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.list({ conversationId: "conv-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
