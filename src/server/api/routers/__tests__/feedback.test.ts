import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "@/server/api/trpc";
import { feedbackRouter } from "../feedback";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
// Admin notification email is fire-and-forget; stub it so tests don't hit Resend.
vi.mock("@/server/emails", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

function makeMockDb() {
  return {
    query: {
      seekerProfile: { findFirst: vi.fn() },
      employerProfile: { findFirst: vi.fn() },
      feedback: { findMany: vi.fn() },
      users: { findFirst: vi.fn() },
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

const createCaller = createCallerFactory(feedbackRouter);

const CREATED = {
  id: "fb-1",
  userId: "user-1",
  category: "BUG",
  message: "Something is broken",
  status: "OPEN",
  createdAt: new Date(),
};

describe("feedback.submit", () => {
  let mockDb: ReturnType<typeof makeMockDb>;
  beforeEach(() => {
    mockDb = makeMockDb();
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([CREATED]),
      }),
    });
  });

  it("happy path: SEEKER submits feedback", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    const result = await caller.submit({ category: "BUG", message: "Something is broken" });
    expect(result).toEqual(CREATED);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("happy path: EMPLOYER submits a thank-you", async () => {
    const caller = createCaller(makeCtx("EMPLOYER", mockDb));
    mockDb.query.employerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    await expect(
      caller.submit({ category: "THANKS", message: "Love this platform" }),
    ).resolves.toBeDefined();
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.submit({ category: "BUG", message: "x" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("SUSPENDED seeker → FORBIDDEN", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({ status: "SUSPENDED" });
    await expect(caller.submit({ category: "BUG", message: "x" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("empty message → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(caller.submit({ category: "BUG", message: "   " })).rejects.toThrow();
  });

  it("message 2001 chars → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(caller.submit({ category: "BUG", message: "a".repeat(2001) })).rejects.toThrow();
  });

  it("invalid category → Zod validation error", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    await expect(
      // @ts-expect-error testing invalid enum value
      caller.submit({ category: "SPAM", message: "x" }),
    ).rejects.toThrow();
  });

  it("over the daily cap → TOO_MANY_REQUESTS", async () => {
    const caller = createCaller(makeCtx("SEEKER", mockDb));
    mockDb.query.seekerProfile.findFirst.mockResolvedValue({ status: "ACTIVE" });
    mockDb.$count.mockResolvedValue(5);
    await expect(caller.submit({ category: "BUG", message: "x" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});

describe("feedback.listAll (admin)", () => {
  let mockDb: ReturnType<typeof makeMockDb>;
  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it("unauthenticated → UNAUTHORIZED", async () => {
    const caller = createCaller(makeCtx(null, mockDb));
    await expect(caller.listAll()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each(["SEEKER", "EMPLOYER"] as const)("%s → FORBIDDEN", async (role) => {
    const caller = createCaller(makeCtx(role, mockDb));
    await expect(caller.listAll()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ADMIN gets rows", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    mockDb.query.feedback.findMany.mockResolvedValue([CREATED]);
    const result = await caller.listAll();
    expect(result).toEqual([CREATED]);
  });
});

describe("feedback.updateStatus (admin)", () => {
  let mockDb: ReturnType<typeof makeMockDb>;
  beforeEach(() => {
    mockDb = makeMockDb();
  });

  it.each(["SEEKER", "EMPLOYER"] as const)("%s → FORBIDDEN", async (role) => {
    const caller = createCaller(makeCtx(role, mockDb));
    await expect(caller.updateStatus({ id: "fb-1", status: "RESOLVED" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("ADMIN updates status", async () => {
    const caller = createCaller(makeCtx("ADMIN", mockDb));
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...CREATED, status: "RESOLVED" }]),
        }),
      }),
    });
    const result = await caller.updateStatus({ id: "fb-1", status: "RESOLVED" });
    expect(result.status).toBe("RESOLVED");
  });
});
